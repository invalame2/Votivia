import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

const NAMES = ["Kiz", "Quizzy", "TriviaMan", "BrainPick", "GuessIt", "PickMe", "ThinkUp", "FactDrop", "QMaster", "NoHint", "MindFlip", "FastGuess", "TrueTap", "SnapPick", "QuizFox", "BrainPop", "QRush", "GuessHub", "PickZone", "CleverTap", "QWave", "FactRush", "BrainJam", "QuizDash", "TapNGo", "GuessLab", "MindSpark", "QuickQ", "PickStorm", "TriviaPop", "BrainBuzz", "QClick", "FactFlow", "QuizHive", "GuessBoom", "ThinkBolt", "PickQuest", "MindQuest", "QPulse", "TriviaRush", "FactMode", "BrainShot", "PickKing", "GuessKing", "QuizCraft", "QNova", "ThinkPick", "TapTrivia", "FactQuest", "BrainScope", "PixelQuiz", "RetroGuess", "NeonPick", "EchoTrivia", "OrbitQuiz", "AlphaGuess", "NovaTrivia", "FrostPick", "ShadowQuiz", "TurboGuess", "CosmicPick", "LuckyGuess", "RapidQuiz", "BlinkPick", "ZeroHint", "MysteryPick", "HiddenGuess", "RandomMind", "ChaosQuiz", "BrainStormer", "FactHunter", "QuizHunter", "PickHunter", "GuessHunter", "MindRider", "TriviaPilot", "QuickThink", "PickMachine", "GuessMachine", "FactMachine", "BrainByte", "QuizByte", "PickByte", "GuessByte", "TriviaLoop", "MindLoop", "QLoop", "PickLoop", "GuessLoop", "FactLoop", "TapMaster", "ChoiceMaker", "EitherWay", "ThisOrThat", "PickOrPass", "GuessOrLose", "MindArena", "QuizArena", "TriviaArena", "BrainArena", "PickArena", "QNation", "TriviaNation", "GuessNation", "MindNation", "PixelMind", "FactPixel", "QuizPixel", "PickPixel", "GuessPixel", "NeonMind", "RetroMind", "VoidGuess", "PhantomQuiz", "AstroPick", "OrbitMind", "GravityGuess", "EclipseQuiz", "CometTrivia", "SparkGuess", "VoltPick", "HyperQuiz", "UltraGuess", "MegaTrivia", "PrimePick", "NextGuess", "CoreTrivia", "LogicPick", "BrainFuel", "IQDrop", "SmartTap", "ThinkRush", "GuessSprint", "PickSprint", "TriviaSprint", "MindSprint", "QuizSprint", "FactSprint", "BrainWave", "PickWave", "GuessWave", "TriviaWave", "QuizWave", "ThinkWave", "BrainDock", "QuizDock", "GuessDock", "PickDock", "FactDock", "MindDock", "QDock", "PickVerse", "GuessVerse", "TriviaVerse", "QuizVerse", "MindVerse", "FactVerse", "ThinkVerse", "QVerse", "BrainCore", "PickCore", "GuessCore", "TriviaCore", "QuizCore", "FactCore"];

const COLORS = [
  // Blues
  "#3b82f6", "#0ea5e9", "#0284c7", "#60a5fa", "#38bdf8",
  // Greens
  "#22c55e", "#16a34a", "#10b981", "#34d399", "#14b8a6",
  // Purples
  "#8b5cf6", "#a855f7", "#c084fc", "#d8b4fe", "#e879f9",
  // Reds/Pinks
  "#ef4444", "#f43f5e", "#f472b6", "#fb7185", "#ec4899",
  // Oranges/Ambers
  "#f97316", "#fb923c", "#f59e0b", "#fbbf24", "#fcd34d",
  // Teals/Cyan
  "#06b6d4", "#2dd4bf", "#67e8f9",
  // Indigo
  "#6366f1", "#818cf8",
  // Lime/emerald
  "#84cc16", "#a3e635",
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomTag(): string {
  return Math.floor(100 + Math.random() * 900).toString(); // 100 to 999
}

export async function POST(request: NextRequest) {
  const { uuid } = await request.json();

  if (!uuid) {
    return Response.json({ error: "Missing UUID" }, { status: 400 });
  }

  // 1. Check if profile exists
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("uuid", uuid)
    .single();

  if (profile) {
    return Response.json({ profile });
  }

  // 2. Generate new profile
  let success = false;
  let newProfile = null;
  let attempts = 0;

  while (!success && attempts < 10) {
    attempts++;
    const username = getRandomItem(NAMES);
    const tag = getRandomTag();
    const color = getRandomItem(COLORS);

    const { data, error: insertErr } = await supabase
      .from("profiles")
      .insert({ uuid, username, tag, color })
      .select()
      .single();

    if (!insertErr && data) {
      success = true;
      newProfile = data;
    }
  }

  if (success && newProfile) {
    return Response.json({ profile: newProfile });
  } else {
    return Response.json({ error: "Failed to create profile" }, { status: 500 });
  }
}
