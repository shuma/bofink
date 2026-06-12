"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InsurelyConnect } from "@/components/agent/insurely";
import type { InsurelyLoanRaw } from "@/types/insurely";
import { transformInsurelyLoan, formatBindingPeriod } from "@/lib/insurely/transform";
import { QuestionCard } from "@/components/agent/question-card";
import { ChatInput } from "@/components/chat-input";
import {
  useAgentStore,
  BOLAN_QUESTIONS,
  type Category,
} from "@/hooks/use-agent-store";
import { useMortgageStore } from "@/hooks/use-mortgage-store";
import { useChatStore } from "@/hooks/use-chat-store";
import type { Loan } from "@/types/loan";

// Demo data for testing when Insurely is not configured
const DEMO_LOANS_RAW = [
  {
    company: "se-sbab",
    companyDisplayName: "SBAB",
    financedObject: "Stockholm Hsb:s Brf Segelflygaren i Stoc...",
    firstDrawDownDate: "2021-07-29",
    id: "8310f2ea-9a7b-43d0-87af-80362281dd4b",
    interest: {
      rate: 0.0284,
      rateAdjustmentDate: "2027-03-19",
    },
    interestBindingPeriod: "ONE_YEAR",
    loanDetails: {
      granted: { currency: "SEK", amount: 1300000 },
      paid: { currency: "SEK", amount: 125976 },
      balance: { currency: "SEK", amount: 1174024 },
    },
    loanId: "92543149716",
    nextPayment: {
      instalment: { currency: "SEK", amount: 2172 },
      interest: { currency: "SEK", amount: 2784 },
      total: { currency: "SEK", amount: 4956 },
      date: "2026-05-30",
    },
    owners: [
      { name: "Anna Meiton", sharePercentage: 0.5 },
      { name: "Usman Rajab", sharePercentage: 0.5 },
    ],
    status: "IN_PROGRESS",
    type: "MORTGAGE_LOAN",
  },
  {
    company: "se-sbab",
    companyDisplayName: "SBAB",
    financedObject: "Stockholm Hsb:s Brf Segelflygaren i Stoc...",
    firstDrawDownDate: "2021-07-29",
    id: "2cbe510e-6567-485e-a859-b9a90547285c",
    interest: {
      rate: 0.0284,
      rateAdjustmentDate: "2027-03-19",
    },
    interestBindingPeriod: "ONE_YEAR",
    loanDetails: {
      granted: { currency: "SEK", amount: 1310000 },
      paid: { currency: "SEK", amount: 126034 },
      balance: { currency: "SEK", amount: 1183966 },
    },
    loanId: "92543149694",
    nextPayment: {
      instalment: { currency: "SEK", amount: 2173 },
      interest: { currency: "SEK", amount: 2807 },
      total: { currency: "SEK", amount: 4980 },
      date: "2026-05-30",
    },
    owners: [
      { name: "Anna Meiton", sharePercentage: 0.5 },
      { name: "Usman Rajab", sharePercentage: 0.5 },
    ],
    status: "IN_PROGRESS",
    type: "MORTGAGE_LOAN",
  },
  {
    company: "se-sbab",
    companyDisplayName: "SBAB",
    financedObject: "Stockholm Hsb:s Brf Segelflygaren i Stoc...",
    firstDrawDownDate: "2021-07-29",
    id: "92962d4c-8395-4759-be3c-a15c57aa41b8",
    interest: {
      rate: 0.0284,
      rateAdjustmentDate: "2027-03-19",
    },
    interestBindingPeriod: "ONE_YEAR",
    loanDetails: {
      granted: { currency: "SEK", amount: 1300000 },
      paid: { currency: "SEK", amount: 125976 },
      balance: { currency: "SEK", amount: 1174024 },
    },
    loanId: "92543149708",
    nextPayment: {
      instalment: { currency: "SEK", amount: 2172 },
      interest: { currency: "SEK", amount: 2784 },
      total: { currency: "SEK", amount: 4956 },
      date: "2026-05-30",
    },
    owners: [
      { name: "Anna Meiton", sharePercentage: 0.5 },
      { name: "Usman Rajab", sharePercentage: 0.5 },
    ],
    status: "IN_PROGRESS",
    type: "MORTGAGE_LOAN",
  },
];


// Status card with text shimmer effect
function StatusCard({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="inline-block bg-secondary/40 rounded-xl px-5 py-4">
      <p className="text-[14px] font-medium text-muted-foreground/70 shimmer">
        {title}
      </p>
      <p className="text-[13px] mt-0.5 text-muted-foreground/50 shimmer">
        {subtitle}
      </p>
    </div>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") as Category | null;

  const {
    mode,
    setMode,
    setSelectedCategory,
    currentQuestionIndex,
    nextQuestion,
    previousQuestion,
    addAnswer,
    collectedAnswers,
    reset,
  } = useAgentStore();

  const { setFromAgentAnswers, addLoan, setAdress, setBoVarde, resetAll } = useMortgageStore();
  const { clearMessages } = useChatStore();

  // Reset and set category from URL params on mount
  useEffect(() => {
    if (category && (category === "bolan" || category === "forsakringar")) {
      // Reset to ensure fresh start with Insurely mode
      reset();
      setSelectedCategory(category);
      setMode("insurely");
    } else {
      // Invalid or missing category, redirect to start
      router.push("/");
    }
  }, [category, setSelectedCategory, setMode, reset, router]);

  // Redirect if no valid category
  if (!category || (category !== "bolan" && category !== "forsakringar")) {
    return null;
  }

  const questions = category === "bolan" ? BOLAN_QUESTIONS : [];
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const canGoBack = currentQuestionIndex > 0;

  const handleInsurelyComplete = (loans: InsurelyLoanRaw[]) => {
    // Reset existing data and chat history
    resetAll();
    clearMessages();

    // Transform and add loans
    loans.forEach((rawLoan) => {
      const loan = transformInsurelyLoan(rawLoan);
      addLoan(loan);
    });

    // Try to extract property address from the first loan
    const mortgageLoan = loans.find((loan) => loan.type === "MORTGAGE_LOAN");
    if (mortgageLoan?.financedObject) {
      setAdress(mortgageLoan.financedObject);
    }

    router.push("/dashboard?source=insurely");
  };

  const handleDemoData = () => {
    // Reset existing data and chat history
    resetAll();
    clearMessages();

    // Convert demo loans to our Loan format and add them
    DEMO_LOANS_RAW.forEach((rawLoan) => {
      const loan: Omit<Loan, "id"> = {
        namn: `${rawLoan.companyDisplayName} - ${rawLoan.loanId}`,
        belopp: rawLoan.loanDetails.balance.amount,
        ranta: rawLoan.interest.rate * 100, // Convert from decimal to percentage
        amortering: rawLoan.nextPayment.instalment.amount * 12, // Yearly amortization
        bank: rawLoan.companyDisplayName,
        typ: formatBindingPeriod(rawLoan.interestBindingPeriod),
        rantaForfall: rawLoan.interest.rateAdjustmentDate,
        agare: rawLoan.owners.map((owner) => ({
          namn: owner.name,
          andel: owner.sharePercentage * 100, // Convert from decimal to percentage
        })),
        nextPayment: {
          amortering: rawLoan.nextPayment.instalment.amount,
          ranta: rawLoan.nextPayment.interest.amount,
          total: rawLoan.nextPayment.total.amount,
          datum: rawLoan.nextPayment.date,
        },
      };
      addLoan(loan);
    });

    // Set some default property info
    setAdress("Segelflygaren, Stockholm");
    setBoVarde(5000000); // Estimated property value

    router.push("/dashboard?source=insurely");
  };

  const handleSkipToManual = () => {
    setMode("manual");
  };

  const handleAnswer = (value: string | number | string[]) => {
    if (!currentQuestion) return;

    const finalValue = Array.isArray(value) ? value.join(", ") : value;

    addAnswer({
      field: currentQuestion.field,
      value: finalValue,
      question: currentQuestion.question,
    });

    if (isLastQuestion) {
      const answers = collectedAnswers.reduce(
        (acc, ans) => {
          acc[ans.field] = ans.value;
          return acc;
        },
        {} as Record<string, string | number>
      );

      answers[currentQuestion.field] = finalValue;

      const mappedAnswers: Record<string, string | number> = {};
      if (answers.address) mappedAnswers.adress = answers.address as string;
      if (answers.propertyValue)
        mappedAnswers.boVarde = answers.propertyValue as number;
      if (answers.loanAmount)
        mappedAnswers.loanAmount = answers.loanAmount as number;
      if (answers.interestRate)
        mappedAnswers.interestRate = answers.interestRate as number;
      if (answers.monthlyIncome)
        mappedAnswers.inkomst = answers.monthlyIncome as number;
      if (answers.birthYear)
        mappedAnswers.fodelsear = answers.birthYear as number;

      setFromAgentAnswers(mappedAnswers);
      router.push("/dashboard");
    } else {
      nextQuestion();
    }
  };

  const handleBack = () => {
    if (canGoBack) {
      previousQuestion();
    }
  };

  const handleSkipAll = () => {
    router.push("/dashboard");
  };

  const now = new Date();
  const timeString = now.toLocaleString("sv-SE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-svh w-full bg-background flex flex-col">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto pb-[450px]">
        <div className="mx-auto max-w-2xl px-4 py-6">
          {/* Timestamp */}
          <div className="text-center mb-6">
            <span className="text-xs text-muted-foreground/50">
              {timeString}
            </span>
          </div>

          {/* Status card */}
          {mode === "insurely" ? (
            <StatusCard
              title="Inväntar svar"
              subtitle="Planerar din bolåneöversikt..."
            />
          ) : (
            <StatusCard
              title="Inväntar svar"
              subtitle={`Fråga ${currentQuestionIndex + 1} av ${questions.length}...`}
            />
          )}
        </div>
      </div>

      {/* Fixed bottom: Question Card / Insurely + Chat Input */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-background">
        <div className="mx-auto max-w-2xl px-4 pb-4 space-y-3">
          {/* Insurely or Question card */}
          {mode === "insurely" ? (
            <InsurelyConnect
              onComplete={handleInsurelyComplete}
              onSkip={handleSkipToManual}
              onDemoData={handleDemoData}
            />
          ) : (
            currentQuestion && (
              <QuestionCard
                question={{
                  field: currentQuestion.field,
                  question: currentQuestion.question,
                  inputType: currentQuestion.inputType,
                  placeholder: currentQuestion.placeholder,
                  unit: currentQuestion.unit,
                  options: [],
                  allowCustom: true,
                  allowMultiple: false,
                }}
                onAnswer={handleAnswer}
                onSkip={handleSkipAll}
                onBack={handleBack}
                canGoBack={canGoBack}
                isLast={isLastQuestion}
                questionNumber={currentQuestionIndex + 1}
                totalQuestions={questions.length}
              />
            )
          )}

          {/* Chat Input - disabled */}
          <ChatInput
            placeholder="Berätta vad du vill göra istället..."
            disabled
          />
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-svh w-full bg-background flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
