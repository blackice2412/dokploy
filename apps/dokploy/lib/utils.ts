import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export async function generateSHA256Hash(text: string) {
	const encoder = new TextEncoder();
	const data = encoder.encode(text);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function formatTimestamp(timestamp: string | number) {
	try {
		// Si es un string ISO, lo parseamos directamente
		if (typeof timestamp === "string" && timestamp.includes("T")) {
			const date = new Date(timestamp);
			if (!Number.isNaN(date.getTime())) {
				return date.toLocaleString();
			}
		}
		return "Fecha inválida";
	} catch {
		return "Fecha inválida";
	}
}

export function getFallbackAvatarInitials(
	fullName: string | undefined,
): string {
	if (typeof fullName === "undefined" || fullName === "") return "CN";
	const [name = "", surname = ""] = fullName.split(" ");
	if (surname === "") {
		return name.substring(0, 2).toUpperCase();
	}
	return (name.charAt(0) + surname.charAt(0)).toUpperCase();
}

export const formatBytes = (bytes: number): string => {
	if (!Number.isFinite(bytes) || bytes <= 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

export const convertToMB = (value: number, unit?: string): number => {
	if (!Number.isFinite(value)) return 0;
	const normalizedUnit = (unit || "MB").trim().toUpperCase();

	switch (normalizedUnit) {
		case "B":
			return value / (1024 * 1024);
		case "KB":
		case "KIB":
			return value / 1024;
		case "MB":
		case "MIB":
			return value;
		case "GB":
		case "GIB":
			return value * 1024;
		case "TB":
		case "TIB":
			return value * 1024 * 1024;
		default:
			return value;
	}
};

export const formatMemoryUsage = (
	usedInMB: number,
	totalInMB: number,
): string => {
	const usedInBytes = usedInMB * 1024 * 1024;
	const totalInBytes = totalInMB * 1024 * 1024;

	if (!Number.isFinite(totalInMB) || totalInMB <= 0) {
		return `${formatBytes(usedInBytes)} / 0 Bytes`;
	}

	const percentage = ((usedInMB / totalInMB) * 100).toFixed(1);
	return `${formatBytes(usedInBytes)} / ${formatBytes(totalInBytes)} (${percentage}%)`;
};

type MetricsTokenData = {
	serverIp?: string | null;
	metricsConfig?: {
		server?: {
			port?: number;
			token?: string | null;
		};
	} | null;
};

export const getMonitoringConnection = (
	monitoring: MetricsTokenData | undefined,
	baseUrl: string,
	defaultToken: string,
) => {
	const isProduction = process.env.NODE_ENV === "production";

	return {
		baseUrl: isProduction
			? `http://${monitoring?.serverIp}:${monitoring?.metricsConfig?.server?.port}`
			: baseUrl,
		token: isProduction
			? monitoring?.metricsConfig?.server?.token || defaultToken
			: defaultToken,
	};
};
