import React, { memo, useState, useEffect } from "react";
import { Box, Text } from "ink";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_INTERVAL = 80;

const SILLY_WORDS = [
  "Thinking",
  "Pondering",
  "Cogitating",
  "Ruminating",
  "Mulling",
  "Noodling",
  "Smooshing",
  "Percolating",
  "Marinating",
  "Simmering",
  "Brewing",
  "Conjuring",
  "Manifesting",
  "Vibing",
  "Channeling",
];
const SILLY_WORD_INTERVAL = 2000;

function Spinner() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, SPINNER_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return <Text color="yellow">{SPINNER_FRAMES[frame]} </Text>;
}

function useSillyWord() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * SILLY_WORDS.length));

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % SILLY_WORDS.length);
    }, SILLY_WORD_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return SILLY_WORDS[index];
}

type StatusBarProps = {
  isStreaming: boolean;
  elapsedSeconds: number;
  status?: string;
};

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

// Status indicator - not memoized to allow spinner animation
function StatusIndicator({
  isStreaming,
  status
}: {
  isStreaming: boolean;
  status?: string;
}) {
  const sillyWord = useSillyWord();
  const isDefaultStatus = !status || status === "Thinking...";
  const displayStatus = isDefaultStatus ? `${sillyWord}...` : status;

  if (isStreaming) {
    return (
      <>
        <Spinner />
        <Text color="yellow">{displayStatus}</Text>
      </>
    );
  }
  return <Text color="green">✓ {status || "Done"}</Text>;
}

// Memoized time display
const StatusMeta = memo(function StatusMeta({
  elapsedSeconds,
}: {
  elapsedSeconds: number;
}) {
  return (
    <Text color="gray">
      {" "}
      ({formatTime(elapsedSeconds)} · esc to interrupt)
    </Text>
  );
});

// Not memoized to allow spinner animation
export function StatusBar({
  isStreaming,
  elapsedSeconds,
  status,
}: StatusBarProps) {
  if (!isStreaming && !status) {
    return null;
  }

  return (
    <Box marginTop={1}>
      <StatusIndicator isStreaming={isStreaming} status={status} />
      <StatusMeta elapsedSeconds={elapsedSeconds} />
    </Box>
  );
}
