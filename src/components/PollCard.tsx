"use client";

interface PollCardProps {
  question: string;
  optionAText: string;
  optionAImage: string | null;
  optionBText: string;
  optionBImage: string | null;
  onVote: (option: "a" | "b") => void;
  current: number;
  total: number;
}

export default function PollCard({
  question,
  optionAText,
  optionAImage,
  optionBText,
  optionBImage,
  onVote,
  current,
  total,
}: PollCardProps) {
  return (
    <div className="flex flex-col w-full h-full flex-1 gap-6">
      {/* Progress */}
      <div className="font-sans font-bold text-sm text-muted text-center">
        {current} / {total}
      </div>

      {/* Question */}
      <h2 className="text-4xl md:text-5xl font-black text-foreground text-center leading-tight px-4">
        {question}
      </h2>

      {/* Options - take up remaining space */}
      <div className="flex flex-col md:flex-row flex-1 gap-4 min-h-0">
        {/* Option A */}
        <button
          onClick={() => onVote("a")}
          className={`flex-1 flex flex-col items-center justify-center border-[3px] border-black bg-surface rounded-xl transition-colors active:scale-[0.99] group overflow-hidden relative ${
            optionAImage ? "" : "hover:bg-[#2a2a2a]"
          }`}
          id="poll-option-a"
        >
          {optionAImage && (
            <>
              <div className="absolute inset-0 bg-black/50 z-10 group-hover:bg-black/40 transition-colors" />
              <img
                src={optionAImage}
                alt={optionAText}
                className="absolute inset-0 w-full h-full object-cover z-0"
              />
            </>
          )}
          <span className={`font-black text-3xl md:text-4xl uppercase text-center px-8 py-8 leading-tight relative z-20 ${optionAImage ? "text-white" : ""}`}>
            {optionAText}
          </span>
        </button>

        {/* Option B */}
        <button
          onClick={() => onVote("b")}
          className={`flex-1 flex flex-col items-center justify-center border-[3px] border-black bg-surface rounded-xl transition-colors active:scale-[0.99] group overflow-hidden relative ${
            optionBImage ? "" : "hover:bg-[#2a2a2a]"
          }`}
          id="poll-option-b"
        >
          {optionBImage && (
            <>
              <div className="absolute inset-0 bg-black/50 z-10 group-hover:bg-black/40 transition-colors" />
              <img
                src={optionBImage}
                alt={optionBText}
                className="absolute inset-0 w-full h-full object-cover z-0"
              />
            </>
          )}
          <span className={`font-black text-3xl md:text-4xl uppercase text-center px-8 py-8 leading-tight relative z-20 ${optionBImage ? "text-white" : ""}`}>
            {optionBText}
          </span>
        </button>
      </div>
    </div>
  );
}
