// Collection status from Insurely API
export type CollectionStatus =
  | "CREATED"
  | "RUNNING"
  | "LOGIN"
  | "TWO_FACTOR_PENDING"
  | "COLLECTING"
  | "COMPLETED"
  | "COMPLETED_PARTIAL"
  | "FAILED"
  | "INCORRECT_CREDENTIALS"
  | "AUTHENTICATION_TIMEOUT"
  | "CANCELLED";

// Bank/company info from Insurely
export interface InsurelyCompany {
  id: string;
  displayName: string;
  country: string;
  functionalCapabilities: string[];
  loginMethods: string[]; // Raw login methods from API
  logo?: string;
}

// QR code data for BankID
export interface BankIdQrData {
  qrStartToken: string;
  qrStartSecret: string;
  qrAuthCode: string;
  autoStartToken: string;
}

// Collection status response from Insurely
export interface CollectionStatusResponse {
  collectionId: string;
  sessionId: string;
  status: CollectionStatus;
  statusMessage?: string;
  bankId?: {
    qrData?: BankIdQrData;
    autoStartToken?: string;
    base64QrCode?: string; // Base64 encoded QR image from Insurely
  };
  progress?: number;
}

// Money amount
export interface InsurelyAmount {
  currency: string;
  amount: number;
}

// Interest details
export interface InsurelyInterest {
  rate: number;
  rateAdjustmentDate: string;
}

// Loan details
export interface InsurelyLoanDetails {
  granted: InsurelyAmount;
  paid: InsurelyAmount;
  balance: InsurelyAmount;
}

// Next payment info
export interface InsurelyNextPayment {
  instalment: InsurelyAmount;
  interest: InsurelyAmount;
  total: InsurelyAmount;
  date: string;
}

// Loan owner
export interface InsurelyOwner {
  name: string;
  sharePercentage: number;
}

// Binding period type
export type BindingPeriod =
  | "ONE_YEAR"
  | "TWO_YEARS"
  | "THREE_YEARS"
  | "FIVE_YEARS"
  | "VARIABLE";

// Loan type
export type LoanType = "MORTGAGE_LOAN" | "PERSONAL_LOAN" | "CAR_LOAN" | "OTHER";

// Loan status
export type LoanStatus = "IN_PROGRESS" | "PAID_OFF" | "OVERDUE";

// Raw loan data from Insurely API
export interface InsurelyLoanRaw {
  id: string;
  company: string;
  companyDisplayName: string;
  financedObject: string;
  firstDrawDownDate: string;
  loanId: string;
  interest: InsurelyInterest;
  interestBindingPeriod: BindingPeriod;
  loanDetails: InsurelyLoanDetails;
  nextPayment: InsurelyNextPayment;
  owners: InsurelyOwner[];
  status: LoanStatus;
  type: LoanType;
}

// Collection data response
export interface CollectionDataResponse {
  collectionId: string;
  status: CollectionStatus;
  loans: InsurelyLoanRaw[];
  accounts?: unknown[];
}

// Initiate collection request
export interface InitiateCollectionRequest {
  companyId: string;
  personalNumber: string;
  loginMethod: "SWEDISH_MOBILE_BANKID";
}

// Initiate collection response
export interface InitiateCollectionResponse {
  sessionId: string;
  collectionId: string;
  status: CollectionStatus;
  bankId?: {
    qrData?: BankIdQrData;
    autoStartToken?: string;
    base64QrCode?: string;
  };
}
