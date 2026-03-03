import { IS_CLOUD } from "@dokploy/server/constants";
import { validateRequest } from "@dokploy/server/lib/auth";
import { Loader2 } from "lucide-react";
import type { GetServerSidePropsContext } from "next";
import Link from "next/link";
import { useMemo, useState, type ReactElement } from "react";
import { ContainerFreeMonitoring } from "@/components/dashboard/monitoring/free/container/show-free-container-monitoring";
import { ShowPaidMonitoring } from "@/components/dashboard/monitoring/paid/servers/show-paid-monitoring";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useProjectsUsage } from "@/hooks/use-projects-usage";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { formatMemoryUsage, getMonitoringConnection } from "@/lib/utils";
import { api } from "@/utils/api";

const BASE_URL = "http://localhost:3001/metrics";

const DEFAULT_TOKEN = "metrics";

type SortKey = "cpu" | "memory" | "active";

const Dashboard = () => {
	const [toggleMonitoring, _setToggleMonitoring] = useLocalStorage(
		"monitoring-enabled",
		false,
	);
	const [sortKey, setSortKey] = useState<SortKey>("cpu");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
	const { data: monitoring, isPending } = api.user.getMetricsToken.useQuery(undefined, {
		staleTime: 60_000,
		refetchInterval: 60_000,
	});

	const monitoringConnection = getMonitoringConnection(
		monitoring,
		BASE_URL,
		DEFAULT_TOKEN,
	);

	const { projectsUsage, isLoadingProjectsUsage } = useProjectsUsage({
		enabled: toggleMonitoring,
		baseUrl: monitoringConnection.baseUrl,
		token: monitoringConnection.token,
	});

	const handleSort = (key: SortKey) => {
		if (sortKey === key) {
			setSortDirection((currentDirection: "asc" | "desc") =>
				currentDirection === "asc" ? "desc" : "asc",
			);
			return;
		}

		setSortKey(key);
		setSortDirection("desc");
	};

	const sortedProjectsUsage = useMemo(() => {
		const rows = [...projectsUsage];

		rows.sort((a, b) => {
			let comparison = 0;

			switch (sortKey) {
				case "cpu":
					comparison = a.cpuUsage - b.cpuUsage;
					break;
				case "memory":
					comparison = a.memoryUsedMB - b.memoryUsedMB;
					break;
				case "active":
					comparison = a.activeServices - b.activeServices;
					break;
			}

			return sortDirection === "asc" ? comparison : -comparison;
		});

		return rows;
	}, [projectsUsage, sortDirection, sortKey]);

	const sortIndicator = (key: SortKey) => {
		if (sortKey !== key) return "↕";
		return sortDirection === "asc" ? "↑" : "↓";
	};

	return (
		<div className="space-y-4 pb-10">
			{/* <AlertBlock>
				You are watching the <strong>Free</strong> plan.{" "}
				<a
					href="https://dokploy.com#pricing"
					target="_blank"
					className="underline"
					rel="noreferrer"
				>
					Upgrade
				</a>{" "}
				to get more features.
			</AlertBlock> */}
			{isPending ? (
				<Card className="bg-sidebar  p-2.5 rounded-xl  mx-auto  items-center">
					<div className="rounded-xl bg-background flex shadow-md px-4 min-h-[50vh] justify-center items-center text-muted-foreground">
						Loading...
						<Loader2 className="h-4 w-4 animate-spin" />
					</div>
				</Card>
			) : (
				<>
					{/* {monitoring?.enabledFeatures && (
						<div className="flex flex-row border w-fit p-4 rounded-lg items-center gap-2">
							<Label className="text-muted-foreground">Change Monitoring</Label>
							<Switch
								checked={toggleMonitoring}
								onCheckedChange={setToggleMonitoring}
							/>
						</div>
					)} */}
					{toggleMonitoring ? (
						<>
							<Card className="bg-sidebar p-2.5 rounded-xl mx-auto">
								<div className="rounded-xl bg-background shadow-md">
									<ShowPaidMonitoring
										BASE_URL={`${monitoringConnection.baseUrl}/metrics`}
										token={monitoringConnection.token}
									/>
								</div>
							</Card>

							<Card className="bg-sidebar p-2.5 rounded-xl mx-auto">
								<div className="rounded-xl bg-background shadow-md p-6 space-y-4">
									<div>
										<h2 className="text-2xl font-bold tracking-tight">
											Projects Usage
										</h2>
										<p className="text-sm text-muted-foreground">
											Compare resource consumption across all projects in one place.
										</p>
									</div>

									{isLoadingProjectsUsage ? (
										<div className="flex items-center gap-2 text-sm text-muted-foreground">
											<span>Loading project usage...</span>
											<Loader2 className="h-4 w-4 animate-spin" />
										</div>
									) : (
										<div className="rounded-md border">
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Project</TableHead>
														<TableHead className="text-right">
															<button
																type="button"
																onClick={() => handleSort("cpu")}
																className="ml-auto inline-flex items-center gap-1"
															>
																<span>CPU</span>
																<span>{sortIndicator("cpu")}</span>
															</button>
														</TableHead>
														<TableHead className="text-right">
															<button
																type="button"
																onClick={() => handleSort("memory")}
																className="ml-auto inline-flex items-center gap-1"
															>
																<span>Memory</span>
																<span>{sortIndicator("memory")}</span>
															</button>
														</TableHead>
														<TableHead className="text-right">
															<button
																type="button"
																onClick={() => handleSort("active")}
																className="ml-auto inline-flex items-center gap-1"
															>
																<span>Active Services</span>
																<span>{sortIndicator("active")}</span>
															</button>
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{sortedProjectsUsage?.length ? (
														sortedProjectsUsage.map((project) => (
															<TableRow key={project.projectId}>
																<TableCell className="font-medium">
																	{project.defaultEnvironmentId ? (
																		<Link
																			href={`/dashboard/project/${project.projectId}/environment/${project.defaultEnvironmentId}`}
																			className="hover:underline"
																		>
																			{project.projectName}
																		</Link>
																	) : (
																		project.projectName
																	)}
																</TableCell>
																<TableCell className="text-right">
																	{project.cpuUsage.toFixed(2)}%
																</TableCell>
																<TableCell className="text-right">
																	{formatMemoryUsage(
																		project.memoryUsedMB,
																		project.memoryTotalMB,
																	)}
																</TableCell>
																<TableCell className="text-right">
																	{project.activeServices}/{project.totalServices}
																</TableCell>
															</TableRow>
														))
													) : (
														<TableRow>
															<TableCell
																colSpan={4}
																className="text-center text-muted-foreground"
															>
																No project usage data available yet.
															</TableCell>
														</TableRow>
													)}
												</TableBody>
											</Table>
										</div>
									)}
								</div>
							</Card>
						</>
					) : (
						<Card className="h-full bg-sidebar  p-2.5 rounded-xl">
							<div className="rounded-xl bg-background shadow-md p-6">
								<ContainerFreeMonitoring appName="dokploy" />
							</div>
						</Card>
					)}
				</>
			)}
		</div>
	);
};

export default Dashboard;

Dashboard.getLayout = (page: ReactElement) => {
	return <DashboardLayout>{page}</DashboardLayout>;
};
export async function getServerSideProps(
	ctx: GetServerSidePropsContext<{ serviceId: string }>,
) {
	if (IS_CLOUD) {
		return {
			redirect: {
				permanent: true,
				destination: "/dashboard/projects",
			},
		};
	}
	const { user } = await validateRequest(ctx.req);
	if (!user) {
		return {
			redirect: {
				permanent: true,
				destination: "/",
			},
		};
	}

	return {
		props: {},
	};
}
