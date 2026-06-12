import type {
  InsurelyCompany,
  CollectionStatusResponse,
  CollectionDataResponse,
  InitiateCollectionResponse,
  InsurelyLoanRaw,
} from "@/types/insurely";

import type { BindingPeriod } from "@/types/insurely";

const INSURELY_API_BASE = "https://api.insurely.com";
const INSURELY_API_VERSION = "2026-04-01";

// Map Insurely's binding period strings to our type
function mapBindingPeriod(period: string | undefined): BindingPeriod {
  if (!period) return "VARIABLE";
  const normalized = period.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const map: Record<string, BindingPeriod> = {
    ONE_YEAR: "ONE_YEAR",
    TWO_YEARS: "TWO_YEARS",
    THREE_YEARS: "THREE_YEARS",
    THREE_MONTHS: "VARIABLE", // Short terms treated as variable
    FIVE_YEARS: "FIVE_YEARS",
    FIE_YEARS: "FIVE_YEARS", // Handle typo in API data
    VARIABLE: "VARIABLE",
  };
  return map[normalized] || "VARIABLE";
}

// Demo mode flag - set INSURELY_API_KEY=demo to enable
const isDemoMode = (key: string) => key.toLowerCase() === "demo";

// Demo session storage (in-memory, server-side)
const demoSessions = new Map<string, { status: string; pollCount: number }>();

// Demo loan data
const DEMO_LOANS: InsurelyLoanRaw[] = [
  {
    id: "demo-loan-1",
    company: "se-sbab",
    companyDisplayName: "SBAB",
    financedObject: "Stockholm Hsb:s Brf Segelflygaren",
    firstDrawDownDate: "2021-07-29",
    loanId: "92543149716",
    interest: { rate: 0.0284, rateAdjustmentDate: "2027-03-19" },
    interestBindingPeriod: "ONE_YEAR",
    loanDetails: {
      granted: { currency: "SEK", amount: 1300000 },
      paid: { currency: "SEK", amount: 125976 },
      balance: { currency: "SEK", amount: 1174024 },
    },
    nextPayment: {
      instalment: { currency: "SEK", amount: 2172 },
      interest: { currency: "SEK", amount: 2784 },
      total: { currency: "SEK", amount: 4956 },
      date: "2026-05-30",
    },
    owners: [
      { name: "Demo Användare", sharePercentage: 1.0 },
    ],
    status: "IN_PROGRESS",
    type: "MORTGAGE_LOAN",
  },
  {
    id: "demo-loan-2",
    company: "se-sbab",
    companyDisplayName: "SBAB",
    financedObject: "Stockholm Hsb:s Brf Segelflygaren",
    firstDrawDownDate: "2021-07-29",
    loanId: "92543149694",
    interest: { rate: 0.0315, rateAdjustmentDate: "2028-07-15" },
    interestBindingPeriod: "THREE_YEARS",
    loanDetails: {
      granted: { currency: "SEK", amount: 1310000 },
      paid: { currency: "SEK", amount: 126034 },
      balance: { currency: "SEK", amount: 1183966 },
    },
    nextPayment: {
      instalment: { currency: "SEK", amount: 2173 },
      interest: { currency: "SEK", amount: 3107 },
      total: { currency: "SEK", amount: 5280 },
      date: "2026-05-30",
    },
    owners: [
      { name: "Demo Användare", sharePercentage: 1.0 },
    ],
    status: "IN_PROGRESS",
    type: "MORTGAGE_LOAN",
  },
];

// Swedish banks that support mortgage data
const SWEDISH_MORTGAGE_LENDERS: InsurelyCompany[] = [
  {
    id: "se-sbab",
    displayName: "SBAB",
    country: "SE",
    functionalCapabilities: ["LOANS"],
    loginMethods: ["SWEDISH_MOBILE_BANKID"],
  },
  {
    id: "se-nordea",
    displayName: "Nordea",
    country: "SE",
    functionalCapabilities: ["LOANS"],
    loginMethods: ["SWEDISH_MOBILE_BANKID"],
  },
  {
    id: "se-seb",
    displayName: "SEB",
    country: "SE",
    functionalCapabilities: ["LOANS"],
    loginMethods: ["SWEDISH_MOBILE_BANKID"],
  },
  {
    id: "se-swedbank",
    displayName: "Swedbank",
    country: "SE",
    functionalCapabilities: ["LOANS"],
    loginMethods: ["SWEDISH_MOBILE_BANKID"],
  },
  {
    id: "se-handelsbanken",
    displayName: "Handelsbanken",
    country: "SE",
    functionalCapabilities: ["LOANS"],
    loginMethods: ["SWEDISH_MOBILE_BANKID"],
  },
  {
    id: "se-lansforsakringar",
    displayName: "Länsförsäkringar",
    country: "SE",
    functionalCapabilities: ["LOANS"],
    loginMethods: ["SWEDISH_MOBILE_BANKID"],
  },
  {
    id: "se-ikanobanken",
    displayName: "Ikano Bank",
    country: "SE",
    functionalCapabilities: ["LOANS"],
    loginMethods: ["SWEDISH_MOBILE_BANKID"],
  },
  {
    id: "se-skandia",
    displayName: "Skandia",
    country: "SE",
    functionalCapabilities: ["LOANS"],
    loginMethods: ["SWEDISH_MOBILE_BANKID"],
  },
];

export class InsurelyClient {
  private apiKey: string;
  private demoMode: boolean;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("INSURELY_API_KEY is required");
    }
    this.apiKey = apiKey;
    this.demoMode = isDemoMode(apiKey);
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${INSURELY_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "authorization-token": this.apiKey,
        "Insurely-Version": INSURELY_API_VERSION,
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Insurely API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Get list of available Swedish mortgage lenders
   */
  async getCompanies(): Promise<InsurelyCompany[]> {
    // Demo mode: return static list
    if (this.demoMode) {
      return SWEDISH_MORTGAGE_LENDERS;
    }

    // Production: fetch from API
    const response = await this.fetch<Array<{
      company: string;
      companyDisplayName: string;
      functional: boolean;
      status: string;
      loginMethods: string[];
    }>>("/companies/availability");

    // Filter to only functional companies with BankID support
    return response
      .filter((c) => c.functional && c.loginMethods?.some((m) => m.includes("BANKID")))
      .map((c) => ({
        id: c.company,
        displayName: c.companyDisplayName,
        country: "SE",
        functionalCapabilities: ["LOANS"],
        loginMethods: c.loginMethods, // Pass through the actual login methods
      }));
  }

  /**
   * Initiate a data collection session
   */
  async initiateCollection(
    companyId: string,
    personalNumber: string,
    loginMethod?: string
  ): Promise<InitiateCollectionResponse> {
    // Demo mode: simulate the flow
    if (this.demoMode) {
      const sessionId = `demo-${Date.now()}`;
      demoSessions.set(sessionId, { status: "TWO_FACTOR_PENDING", pollCount: 0 });

      return {
        sessionId,
        collectionId: sessionId,
        status: "TWO_FACTOR_PENDING",
        bankId: {
          qrData: {
            qrStartToken: "demo-qr-token",
            qrStartSecret: "demo-secret",
            qrAuthCode: "demo-auth-code",
            autoStartToken: "demo-autostart",
          },
          autoStartToken: "demo-autostart",
        },
      };
    }

    // Select the best login method
    const selectedLoginMethod = loginMethod || "SWEDISH_MOBILE_BANKID_OTHER_DEVICE";

    // Production: call real API with correct format
    const response = await this.fetch<{
      id: string;
      company: string;
      status: string;
      pollingTimeout: string;
      extraInformation?: Record<string, string>;
    }>("/collections", {
      method: "POST",
      body: JSON.stringify({
        company: companyId,
        loginMethod: selectedLoginMethod,
        parameters: [
          {
            type: "SWEDISH_BANKID",
            personalNumber: personalNumber.replace(/\D/g, ""),
          },
        ],
      }),
    });

    // Transform response to our format
    return {
      sessionId: response.id,
      collectionId: response.id,
      status: response.status as InitiateCollectionResponse["status"],
      bankId: response.extraInformation
        ? {
            base64QrCode: response.extraInformation.SWEDISH_BANKID_QRCODE,
            autoStartToken: response.extraInformation.SWEDISH_MOBILE_BANKID_AUTOSTART_TOKEN,
          }
        : undefined,
    };
  }

  /**
   * Get the status of a collection session (for polling)
   */
  async getCollectionStatus(
    sessionId: string
  ): Promise<CollectionStatusResponse> {
    // Demo mode: simulate progress
    if (this.demoMode) {
      const session = demoSessions.get(sessionId);
      if (!session) {
        return { collectionId: sessionId, sessionId, status: "FAILED" };
      }

      session.pollCount++;

      // Simulate BankID flow: pending -> collecting -> completed
      if (session.pollCount < 3) {
        return {
          collectionId: sessionId,
          sessionId,
          status: "TWO_FACTOR_PENDING",
          bankId: {
            qrData: {
              qrStartToken: "demo-qr-token",
              qrStartSecret: "demo-secret",
              qrAuthCode: `demo-auth-${session.pollCount}`,
              autoStartToken: "demo-autostart",
            },
          },
        };
      } else if (session.pollCount < 5) {
        session.status = "COLLECTING";
        return {
          collectionId: sessionId,
          sessionId,
          status: "COLLECTING",
          progress: (session.pollCount - 2) * 33,
        };
      } else {
        session.status = "COMPLETED";
        return {
          collectionId: sessionId,
          sessionId,
          status: "COMPLETED",
          progress: 100,
        };
      }
    }

    // Production: call real API
    const response = await this.fetch<{
      id: string;
      company: string;
      status: string;
      pollingInterval?: number;
      pollingTimeout?: string;
      extraInformation?: Record<string, string>;
    }>(`/collections/${sessionId}/status`);

    // Transform to our format
    return {
      collectionId: response.id,
      sessionId: response.id,
      status: response.status as CollectionStatusResponse["status"],
      bankId: response.extraInformation
        ? {
            base64QrCode: response.extraInformation.SWEDISH_BANKID_QRCODE,
            autoStartToken: response.extraInformation.SWEDISH_MOBILE_BANKID_AUTOSTART_TOKEN,
          }
        : undefined,
    };
  }

  /**
   * Get the collected data after completion
   */
  async getCollectionData(sessionId: string): Promise<CollectionDataResponse> {
    // Demo mode: return demo loans
    if (this.demoMode) {
      return {
        collectionId: sessionId,
        status: "COMPLETED",
        loans: DEMO_LOANS,
      };
    }

    // Production: call real API - wealth data endpoint
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await this.fetch<any[]>(`/collections/${sessionId}/wealth/data`);

    // Log for debugging
    console.log("Insurely wealth data response:", JSON.stringify(response, null, 2));

    // Transform to our loan format - accept any loan-related type
    const loans: InsurelyLoanRaw[] = response
      .filter((item) => {
        const typeUpper = (item.type || "").toUpperCase();
        // Accept mortgages, loans, or any type containing "LOAN" or "MORTGAGE"
        return typeUpper.includes("MORTGAGE") ||
               typeUpper.includes("LOAN") ||
               item.loanDetails !== undefined;
      })
      .map((item) => ({
        id: item.id,
        company: item.company,
        companyDisplayName: item.companyDisplayName,
        financedObject: item.financedObject || "",
        firstDrawDownDate: item.firstDrawDownDate || "",
        loanId: item.loanId || item.id || "",
        interest: {
          rate: item.interest?.rate || item.interest?.baseRate || 0,
          rateAdjustmentDate: item.interest?.rateAdjustmentDate || "",
        },
        interestBindingPeriod: mapBindingPeriod(item.interestBindingPeriod),
        loanDetails: {
          granted: item.loanDetails?.granted || { currency: "SEK", amount: 0 },
          paid: item.loanDetails?.paid || { currency: "SEK", amount: 0 },
          balance: item.loanDetails?.balance || { currency: "SEK", amount: 0 },
        },
        nextPayment: {
          instalment: item.nextPayment?.instalment || { currency: "SEK", amount: 0 },
          interest: item.nextPayment?.interest || { currency: "SEK", amount: 0 },
          total: item.nextPayment?.total || { currency: "SEK", amount: 0 },
          date: item.nextPayment?.date || "",
        },
        owners: (item.owners || []).map((o: { name: string; sharePercentage: number }) => ({
          name: o.name,
          sharePercentage: o.sharePercentage,
        })),
        status: item.status || "IN_PROGRESS",
        type: "MORTGAGE_LOAN" as const,
      }));

    return {
      collectionId: sessionId,
      status: "COMPLETED",
      loans,
    };
  }

  /**
   * Cancel an ongoing collection
   */
  async cancelCollection(sessionId: string): Promise<void> {
    if (this.demoMode) {
      demoSessions.delete(sessionId);
      return;
    }

    await this.fetch(`/collections/${sessionId}/cancel`, {
      method: "POST",
    });
  }
}

// Singleton instance getter
let clientInstance: InsurelyClient | null = null;

export function getInsurelyClient(): InsurelyClient {
  if (!clientInstance) {
    const apiKey = process.env.INSURELY_API_KEY;
    if (!apiKey) {
      throw new Error("INSURELY_API_KEY environment variable is not set");
    }
    clientInstance = new InsurelyClient(apiKey);
  }
  return clientInstance;
}
