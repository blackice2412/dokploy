import { useEffect, useMemo, useState } from "react";
import { convertToMB } from "@/lib/utils";
import { api } from "@/utils/api";

export type ProjectUsageRow = {
	projectId: string;
	projectName: string;
	defaultEnvironmentId: string | null;
	totalServices: number;
	activeServices: number;
	cpuUsage: number;
	memoryUsedMB: number;
	memoryTotalMB: number;
};

type Props = {
	enabled: boolean;
	baseUrl: string;
	token: string;
};

export const useProjectsUsage = ({ enabled, baseUrl, token }: Props) => {
	const utils = api.useUtils();
	const [projectsUsage, setProjectsUsage] = useState<ProjectUsageRow[]>([]);
	const [isLoadingProjectsUsage, setIsLoadingProjectsUsage] = useState(false);

	const { data: projects } = api.project.all.useQuery(undefined, {
		enabled,
		staleTime: 30_000,
		refetchInterval: 30_000,
	});

	const uniqueAppNames = useMemo(() => {
		if (!projects?.length) return [] as string[];

		return Array.from(
			new Set(
				projects.flatMap((project) =>
					project.environments.flatMap((environment) => [
						...environment.applications.map((service) => service.appName),
						...environment.mariadb.map((service) => service.appName),
						...environment.mongo.map((service) => service.appName),
						...environment.mysql.map((service) => service.appName),
						...environment.postgres.map((service) => service.appName),
						...environment.redis.map((service) => service.appName),
						...environment.compose.map((service) => service.appName),
					]),
				),
			),
		).filter((name): name is string => Boolean(name));
	}, [projects]);

	useEffect(() => {
		const buildProjectsUsage = async () => {
			if (!enabled || !token || !baseUrl || !projects?.length) {
				setProjectsUsage([]);
				return;
			}

			if (uniqueAppNames.length === 0) {
				setProjectsUsage(
					projects.map((project) => ({
						projectId: project.projectId,
						projectName: project.name,
						defaultEnvironmentId:
							project.environments.find((environment) => environment.isDefault)
								?.environmentId || project.environments[0]?.environmentId || null,
						totalServices: 0,
						activeServices: 0,
						cpuUsage: 0,
						memoryUsedMB: 0,
						memoryTotalMB: 0,
					})),
				);
				return;
			}

			setIsLoadingProjectsUsage(true);

			try {
				const settledResults = await Promise.allSettled([
					utils.user.getContainerMetrics.fetch({
						url: baseUrl,
						token,
						dataPoints: "1",
						appNames: uniqueAppNames,
					}),
				]);

				const metrics = settledResults
					.filter(
						(result): result is PromiseFulfilledResult<
							Awaited<
								ReturnType<typeof utils.user.getContainerMetrics.fetch>
							>
						> => result.status === "fulfilled",
					)
					.flatMap((result) => result.value || []);

				const latestMetricByApp = new Map(
					metrics
						.filter((metric) => typeof metric?.Name === "string" && metric.Name)
						.map((metric) => [metric.Name as string, metric]),
				);

				const usageRows = projects.map((project) => {
					const defaultEnvironment =
						project.environments.find((environment) => environment.isDefault) ||
						project.environments[0];

					const projectAppNames = Array.from(
						new Set(
							project.environments.flatMap((environment) => [
								...environment.applications.map((service) => service.appName),
								...environment.mariadb.map((service) => service.appName),
								...environment.mongo.map((service) => service.appName),
								...environment.mysql.map((service) => service.appName),
								...environment.postgres.map((service) => service.appName),
								...environment.redis.map((service) => service.appName),
								...environment.compose.map((service) => service.appName),
							]),
						),
					).filter((name): name is string => Boolean(name));

					const availableMetrics = projectAppNames
						.map((appName) => latestMetricByApp.get(appName))
						.filter((metric): metric is NonNullable<typeof metric> => Boolean(metric));

					const cpuUsage = availableMetrics.reduce(
						(total, metric) => total + (metric.CPU || 0),
						0,
					);

					const memoryUsedMB = availableMetrics.reduce((total, metric) => {
						return (
							total +
							convertToMB(
								metric.Memory?.used || 0,
								metric.Memory?.usedUnit || metric.Memory?.unit,
							)
						);
					}, 0);

					const memoryTotalMB = availableMetrics.reduce((total, metric) => {
						return (
							total +
							convertToMB(
								metric.Memory?.total || 0,
								metric.Memory?.totalUnit || metric.Memory?.unit,
							)
						);
					}, 0);

					return {
						projectId: project.projectId,
						projectName: project.name,
						defaultEnvironmentId: defaultEnvironment?.environmentId || null,
						totalServices: projectAppNames.length,
						activeServices: availableMetrics.length,
						cpuUsage,
						memoryUsedMB,
						memoryTotalMB,
					};
				});

				setProjectsUsage(usageRows.sort((a, b) => b.cpuUsage - a.cpuUsage));
			} finally {
				setIsLoadingProjectsUsage(false);
			}
		};

		void buildProjectsUsage();
	}, [baseUrl, enabled, projects, token, uniqueAppNames, utils.user.getContainerMetrics]);

	return {
		projectsUsage,
		isLoadingProjectsUsage,
	};
};
