import { z } from "zod";

// Client -> Server messages

const joinSchema = z.object({
  type: z.literal("join"),
  payload: z.object({
    gameId: z.string(),
    playerName: z.string().min(1).max(30),
  }),
});

const selectTileSchema = z.object({
  type: z.literal("select_tile"),
  payload: z.object({
    tileId: z.string(),
  }),
});

const selectWordsSchema = z.object({
  type: z.literal("select_words"),
  payload: z.object({
    words: z.array(z.string().min(1).max(50)),
  }),
});

const lockInSchema = z.object({
  type: z.literal("lock_in"),
});

const readySchema = z.object({
  type: z.literal("ready"),
});

const changeSeedSchema = z.object({
  type: z.literal("change_seed"),
  payload: z.object({
    direction: z.enum(["next", "prev"]),
  }),
});

const initiateKickSchema = z.object({
  type: z.literal("initiate_kick"),
  payload: z.object({
    targetId: z.string(),
  }),
});

const voteKickSchema = z.object({
  type: z.literal("vote_kick"),
});

const cancelKickSchema = z.object({
  type: z.literal("cancel_kick"),
});

export const clientMessageSchema = z.discriminatedUnion("type", [
  joinSchema,
  selectTileSchema,
  selectWordsSchema,
  lockInSchema,
  readySchema,
  changeSeedSchema,
  initiateKickSchema,
  voteKickSchema,
  cancelKickSchema,
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

// Server -> Client messages

const gamePhaseSchema = z.enum([
  "selecting",
  "reveal",
]);

const playerViewSelfSchema = z.object({
  id: z.string(),
  name: z.string(),
  selectedTile: z.string().nullable(),
  selectedWords: z.array(z.string()),
  lockedIn: z.boolean(),
  readyForNext: z.boolean(),
});

const playerViewOtherSchema = z.object({
  id: z.string(),
  name: z.string(),
  selectedWords: z.array(z.string()),
  lockedIn: z.boolean(),
  readyForNext: z.boolean(),
  hasSelectedTile: z.boolean(),
  selectedTile: z.string().nullable(),
  connected: z.boolean(),
});

const gameConfigSchema = z.object({
  playerCount: z.number(),
  tileMultiplier: z.number(),
  wordList: z.array(z.string()),
  seed: z.number(),
  maxWordsPerPlayer: z.number(),
});

const kickVoteViewSchema = z.object({
  targetId: z.string(),
  targetName: z.string(),
  votesNeeded: z.number(),
  votesCast: z.number(),
  selfHasVoted: z.boolean(),
});

const playerViewSchema = z.object({
  id: z.string(),
  phase: gamePhaseSchema,
  tileIds: z.array(z.string()),
  round: z.number(),
  config: gameConfigSchema,
  seedAdvances: z.number(),
  self: playerViewSelfSchema,
  others: z.array(playerViewOtherSchema),
  activeKickVote: kickVoteViewSchema.nullable(),
});

const roundResultSchema = z.object({
  round: z.number(),
  selections: z.record(z.string(), z.string().nullable()),
  collisions: z.array(z.string()),
  scores: z.record(z.string(), z.number()),
});

const gameStateMessageSchema = z.object({
  type: z.literal("game_state"),
  payload: playerViewSchema,
});

const phaseChangedSchema = z.object({
  type: z.literal("phase_changed"),
  payload: z.object({
    phase: gamePhaseSchema,
  }),
});

const playerJoinedSchema = z.object({
  type: z.literal("player_joined"),
  payload: z.object({
    playerId: z.string(),
    name: z.string(),
  }),
});

const playerLeftSchema = z.object({
  type: z.literal("player_left"),
  payload: z.object({
    playerId: z.string(),
  }),
});

const roundResultMessageSchema = z.object({
  type: z.literal("round_result"),
  payload: roundResultSchema,
});

const playerKickedSchema = z.object({
  type: z.literal("player_kicked"),
  payload: z.object({
    playerId: z.string(),
    name: z.string(),
  }),
});

const errorMessageSchema = z.object({
  type: z.literal("error"),
  payload: z.object({
    message: z.string(),
  }),
});

export const serverMessageSchema = z.discriminatedUnion("type", [
  gameStateMessageSchema,
  phaseChangedSchema,
  playerJoinedSchema,
  playerLeftSchema,
  playerKickedSchema,
  roundResultMessageSchema,
  errorMessageSchema,
]);

export type ServerMessage = z.infer<typeof serverMessageSchema>;
