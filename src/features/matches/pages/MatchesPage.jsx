import { useEffect, useMemo, useRef, useState } from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import {
  assignDrawPositions,
  createCategoryDraw,
  finalizeCategoryDraw,
  getCategoryDraw,
  getCategoryDraws,
  getCategoryRankingPointAwards,
  getEligibleRegistrations,
  publishCategoryDraw,
  updateMatchResult,
} from "../api/matchesApi";
import { getTournaments } from "../../tournaments/api/tournamentApi";

const cardStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "22px",
  marginBottom: "10px",
};

const buttonStyle = {
  border: "none",
  borderRadius: "8px",
  padding: "10px 14px",
  backgroundColor: "#0f172a",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "12px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: "7px",
  backgroundColor: "#ffffff",
  fontSize: "13px",
};

const BRACKET_COLUMN_WIDTH = 250;
const BRACKET_COLUMN_GAP = 32;
const BRACKET_TRACK_WIDTH =
  BRACKET_COLUMN_WIDTH + BRACKET_COLUMN_GAP;
const BRACKET_MATCH_HEIGHT = 68;
const BRACKET_MATCH_BASE_GAP = 8;
const BRACKET_MATCH_BASE_PITCH =
  BRACKET_MATCH_HEIGHT + BRACKET_MATCH_BASE_GAP;

function getBracketMatchGap(roundIndex) {
  return Math.max(
    BRACKET_MATCH_BASE_GAP,
    BRACKET_MATCH_BASE_PITCH * 2 ** roundIndex - BRACKET_MATCH_HEIGHT,
  );
}

function getBracketRoundPadding(roundIndex) {
  return (
    (BRACKET_MATCH_BASE_PITCH / 2) * (2 ** roundIndex - 1)
  );
}

function messageFrom(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

function shuffle(items) {
  const shuffledItems = [...items];
  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledItems[index], shuffledItems[swapIndex]] = [
      shuffledItems[swapIndex],
      shuffledItems[index],
    ];
  }
  return shuffledItems;
}

function createAutoAssignments(registrations, positionLimit) {
  const byeCount = positionLimit - registrations.length;
  const byeMatchIndexes = new Set(
    shuffle(
      Array.from({ length: positionLimit / 2 }, (_, index) => index),
    ).slice(0, byeCount),
  );
  const positions = [];

  for (let matchIndex = 0; matchIndex < positionLimit / 2; matchIndex += 1) {
    const firstPosition = matchIndex * 2 + 1;
    if (byeMatchIndexes.has(matchIndex)) {
      positions.push(
        firstPosition + Math.floor(Math.random() * 2),
      );
    } else {
      positions.push(firstPosition, firstPosition + 1);
    }
  }

  return Object.fromEntries(
    shuffle(registrations).map((registration, index) => [
      String(getRegistrationId(registration)),
      String(positions[index]),
    ]),
  );
}

function unwrapDraw(data) {
  return data?.draw || data;
}

function getDrawId(draw) {
  return draw?.id ?? draw?.drawId ?? null;
}

function getRegistrationId(registration) {
  return (
    registration?.registrationId ??
    registration?.id ??
    registration?.registration?.id ??
    null
  );
}

function getDrawAssignments(draw) {
  if (Array.isArray(draw?.assignments) && draw.assignments.length) {
    return draw.assignments;
  }
  if (!Array.isArray(draw?.participants)) return [];
  return draw.participants
    .map((participant) => ({
      registrationId:
        participant?.registrationId ??
        participant?.registration?.id ??
        participant?.registration?.registrationId ??
        participant?.id,
      bracketPosition: participant?.bracketPosition,
    }))
    .filter(
      (assignment) =>
        assignment.registrationId != null &&
        assignment.bracketPosition != null,
    );
}

function getDrawRegistrationIds(draw) {
  const entryLists = [
    ["assignments", draw?.assignments],
    ["participants", draw?.participants],
    ["registrations", draw?.registrations],
    ["entries", draw?.entries],
  ];
  const selectedList = entryLists.find(
    ([, list]) => Array.isArray(list) && list.length > 0,
  );
  const [field, entries] = selectedList || [];
  if (!entries) return null;

  const ids = entries
    .map(
      (entry) =>
        entry?.registrationId ??
        entry?.registration?.id ??
        entry?.registration?.registrationId ??
        (field === "assignments" ? null : entry?.id) ??
        null,
    )
    .filter((id) => id != null)
    .map(String);
  return ids.length === entries.length ? [...new Set(ids)] : null;
}

function getMemberName(member) {
  if (typeof member === "string") return member;
  return (
    member?.name ||
    member?.athleteName ||
    member?.playerName ||
    member?.user?.name ||
    ""
  );
}

function getRegistrationName(registration) {
  const source =
    registration?.registration ||
    registration?.creator ||
    registration?.user ||
    registration?.player ||
    registration;
  const members = Array.isArray(registration?.members)
    ? registration.members
    : Array.isArray(source?.members)
      ? source.members
      : [];
  const names = members.map(getMemberName).filter(Boolean);
  return (
    registration?.athleteName ||
    registration?.name ||
    source?.athleteName ||
    source?.name ||
    (names.length ? names.join(" / ") : `Registration #${getRegistrationId(registration)}`)
  );
}

function getRegistrationDetail(registration) {
  const source = registration?.registration || registration;
  return (
    registration?.email ||
    registration?.contactEmail ||
    source?.email ||
    source?.contactEmail ||
    ""
  );
}

function flattenMatches(draw) {
  if (Array.isArray(draw?.matches)) return draw.matches;
  if (Array.isArray(draw?.bracket?.matches)) return draw.bracket.matches;
  const rounds = draw?.rounds || draw?.bracket?.rounds;
  if (!Array.isArray(rounds)) return [];
  return rounds.flatMap((round, roundIndex) =>
    (Array.isArray(round.matches) ? round.matches : []).map((match) => ({
      ...match,
      bracketName:
        match.bracketName ??
        round.bracketName ??
        round.bracketType ??
        round.bracket?.name ??
        (typeof round.bracket === "string" ? round.bracket : null),
      stageName: match.stageName ?? round.stageName ?? round.stage,
      roundName:
        match.roundName ||
        round.name ||
        round.roundName ||
        round.title ||
        (round.roundNumber != null
          ? `Round ${round.roundNumber}`
          : `Round ${roundIndex + 1}`),
    })),
  );
}

function getRoundName(match) {
  if (match.roundName || match.round?.name || match.roundTitle) {
    return match.roundName || match.round?.name || match.roundTitle;
  }
  if (typeof match.round === "string") return match.round;
  if (match.roundNumber != null) return `Round ${match.roundNumber}`;
  return "Matches";
}

function getDoubleEliminationSection(roundName, roundMatches) {
  const labels = roundMatches.flatMap((match) => [
    match.bracketName,
    match.bracketType,
    typeof match.bracket === "string" ? match.bracket : match.bracket?.name,
    match.stageName,
    typeof match.stage === "string" ? match.stage : match.stage?.name,
    match.round?.name,
    match.round?.bracketName,
    match.round?.bracketType,
  ]);
  const searchText = [...labels, roundName]
    .filter((label) => typeof label === "string")
    .join(" ")
    .replace(/[_-]+/g, " ")
    .toLowerCase();

  if (/\b(losers?|lower)\b/.test(searchText)) return "losers";
  if (/\b(winners?|upper)\b/.test(searchText)) return "winners";
  if (/\b(grand\s*finals?|championship|finals?)\b/.test(searchText)) {
    return "finals";
  }
  return "other";
}

function getParticipant(
  match,
  side,
  registrationsById,
  registrationsByPosition,
) {
  const slot = Array.isArray(match?.slots) ? match.slots[side - 1] : null;
  const participantList = Array.isArray(match?.participants)
    ? match.participants
    : Array.isArray(match?.entries)
      ? match.entries
      : null;
  const listParticipant = participantList?.[side - 1];
  const direct =
    slot?.participant ??
    listParticipant ??
    match[`participant${side}`] ??
    match[`participant${side}Registration`] ??
    match[`player${side}`] ??
    match[`registration${side}`] ??
    match[`participant${side}Name`] ??
    match[`player${side}Name`] ??
    match[`athlete${side}`] ??
    match[`athlete${side}Name`] ??
    null;
  if (direct && typeof direct === "object") {
    const directName =
      direct.name ||
      direct.athleteName ||
      direct.registrationName ||
      direct.player?.name ||
      direct.user?.name ||
      direct.registration?.name ||
      (Array.isArray(direct.members || direct.registration?.members)
        ? (direct.members || direct.registration.members)
            .map(getMemberName)
            .filter(Boolean)
            .join(" / ")
        : "");
    if (directName) return directName;
  }
  const registrationId =
    (direct && typeof direct === "object"
      ? direct.registrationId ?? direct.registration?.id ?? direct.id
      : null) ??
    match[`participant${side}RegistrationId`] ??
    match[`participant${side}?.registrationId`] ??
    match[`participant${side}RegistrationId`] ??
    match[`participant${side}`]?.registrationId ??
    match[`player${side}`]?.registrationId ??
    match[`participant${side}Id`] ??
    match[`registration${side}Id`] ??
    match[`participant${side}`]?.id ??
    (typeof direct === "number" ? direct : null);
  if (registrationId != null) {
    const participantName = registrationsById.get(String(registrationId));
    if (participantName) return participantName;
  }
  const directPosition =
    slot?.bracketPosition ??
    match[`participant${side}BracketPosition`] ??
    match[`participant${side}Position`] ??
    match[`player${side}Position`] ??
    match[`position${side}`] ??
    (direct && typeof direct === "object"
      ? direct.bracketPosition ?? direct.position ?? direct.seed
      : null);
  const position =
    directPosition ??
    (registrationId != null &&
    !registrationsById.has(String(registrationId))
      ? registrationId
      : null) ??
    (typeof direct === "string" && /^\d+$/.test(direct.trim())
      ? direct.trim()
      : null);
  if (position != null) {
    const assignedName = registrationsByPosition.get(String(Number(position)));
    if (assignedName) return assignedName;
  }
  if (registrationId != null) {
    return typeof direct === "string"
      ? direct
      : `Registration #${registrationId}`;
  }
  return typeof direct === "string" && direct.trim()
    ? direct
    : "Awaiting player";
}

function getParticipantBracketPosition(match, side, assignments) {
  const slot = Array.isArray(match?.slots) ? match.slots[side - 1] : null;
  const participantList = Array.isArray(match?.participants)
    ? match.participants
    : Array.isArray(match?.entries)
      ? match.entries
      : null;
  const participant =
    slot?.participant ??
    participantList?.[side - 1] ??
    match[`participant${side}`] ??
    match[`participant${side}Registration`] ??
    match[`player${side}`] ??
    match[`registration${side}`] ??
    null;
  const directPosition =
    slot?.bracketPosition ??
    (participant && typeof participant === "object"
      ? participant.bracketPosition ?? participant.position ?? participant.seed
      : null) ??
    match[`participant${side}BracketPosition`] ??
    match[`participant${side}Position`] ??
    match[`player${side}Position`] ??
    match[`position${side}`];
  const positionFromResponse = Number(directPosition);
  if (Number.isInteger(positionFromResponse) && positionFromResponse > 0) {
    return positionFromResponse;
  }

  const registrationId =
    (participant && typeof participant === "object"
      ? participant.registrationId ??
        participant.registration?.id ??
        participant.registration?.registrationId ??
        participant.id
      : typeof participant === "number"
        ? participant
        : null) ??
    match[`participant${side}RegistrationId`] ??
    match[`registration${side}Id`] ??
    match[`participant${side}Id`];
  const positionFromAssignments = Number(assignments[String(registrationId)]);
  return Number.isInteger(positionFromAssignments) &&
    positionFromAssignments > 0
    ? positionFromAssignments
    : null;
}

function getMatchStatus(match) {
  const status = String(
    match.status || match.matchStatus || match.state || "pending",
  ).toLowerCase();
  if (status === "in_progress" || status === "live") return "in progress";
  if (status === "finished" || status === "complete") return "completed";
  if (status === "cancelled" || status === "canceled") return "walkover";
  return status;
}

function getMatchGames(match) {
  const games = Array.isArray(match.result?.games)
    ? match.result.games
    : Array.isArray(match.games)
      ? match.games
      : Array.isArray(match.results)
        ? match.results
        : [];
  return games.map((game, index) => ({
    gameNumber: Number(game.gameNumber ?? game.setNumber ?? index + 1),
    participant1Score:
      game.participant1Score ?? game.player1Score ?? game.score1 ?? "",
    participant2Score:
      game.participant2Score ?? game.player2Score ?? game.score2 ?? "",
  }));
}

function getBestOfGameCount(matchFormat) {
  const match = String(matchFormat || "").match(/best\s+of\s+(\d+)/i);
  if (!match) return null;
  const count = Number(match[1]);
  return Number.isInteger(count) && count > 0 && count % 2 === 1
    ? count
    : null;
}

function isByeMatch(match) {
  return (
    getMatchStatus(match) === "bye" ||
    match.isBye === true ||
    match.bye === true
  );
}

function isMatchComplete(match) {
  const status = String(match.status || match.matchStatus || "").toLowerCase();
  return (
    isByeMatch(match) ||
    ["completed", "complete", "finished", "final"].includes(status) ||
    match.winner != null ||
    match.winnerRegistrationId != null
  );
}

function isMatchPlayable(match, registrationsById, registrationsByPosition) {
  if (isByeMatch(match)) return false;
  const first = getParticipant(
    match,
    1,
    registrationsById,
    registrationsByPosition,
  );
  const second = getParticipant(
    match,
    2,
    registrationsById,
    registrationsByPosition,
  );
  return (
    first !== "Awaiting player" &&
    first !== "BYE" &&
    second !== "Awaiting player" &&
    second !== "BYE"
  );
}

function getBadmintonGameWinner(game) {
  const firstScore = game.participant1Score;
  const secondScore = game.participant2Score;
  const highScore = Math.max(firstScore, secondScore);
  const scoreDifference = Math.abs(firstScore - secondScore);
  if (
    highScore > 30 ||
    highScore < 21 ||
    (highScore < 30 && scoreDifference < 2)
  ) {
    return null;
  }
  return firstScore > secondScore ? 1 : 2;
}

function getLatestDraw(draws) {
  if (!draws) return null;
  if (!Array.isArray(draws)) return unwrapDraw(draws);
  if (!draws.length) return null;
  return [...draws].sort((a, b) => {
    const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime() || 0;
    const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime() || 0;
    return aDate - bDate;
  })[draws.length - 1];
}

function getParticipantRegistrationId(match, side) {
  if (!match || typeof match !== "object") return null;
  const participantList = Array.isArray(match.participants)
    ? match.participants
    : Array.isArray(match.entries)
      ? match.entries
      : null;
  const listParticipant = participantList?.[side - 1];
  const direct =
    listParticipant ??
    match[`participant${side}`] ??
    match[`participant${side}Registration`] ??
    match[`player${side}`] ??
    match[`registration${side}`] ??
    null;
  return (
    match[`participant${side}RegistrationId`] ??
    match[`registration${side}Id`] ??
    match[`participant${side}Id`] ??
    (direct && typeof direct === "object"
      ? direct.registrationId ??
        direct.registration?.id ??
        direct.id ??
        null
      : typeof direct === "number"
        ? direct
        : null)
  );
}

function getWinnerSide(match) {
  if (!match || typeof match !== "object") return null;
  if (
    match.winnerSide != null ||
    match.winnerParticipant != null ||
    match.winnerPosition != null
  ) {
    const value =
      match.winnerSide ?? match.winnerParticipant ?? match.winnerPosition;
    const normalized = String(value).toLowerCase();
    if (["1", "participant1", "player1", "a"].includes(normalized)) return 1;
    if (["2", "participant2", "player2", "b"].includes(normalized)) return 2;
  }

  const winner = match.winner;
  const winnerId =
    match.winnerRegistrationId ??
    (winner && typeof winner === "object"
      ? winner.registrationId ?? winner.id
      : winner) ??
    match.winnerId ??
    null;
  if (winnerId != null) {
    const participant1Id = getParticipantRegistrationId(match, 1);
    const participant2Id = getParticipantRegistrationId(match, 2);
    if (participant1Id != null &&
      String(participant1Id) === String(winnerId)) return 1;
    if (participant2Id != null &&
      String(participant2Id) === String(winnerId)) return 2;
  }
  return null;
}

function formatTournamentDate(tournament) {
  const value =
    tournament?.startDate ||
    tournament?.startAt ||
    tournament?.date ||
    tournament?.createdAt;
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getChampion(draw) {
  if (!draw) return null;
  return (
    draw.champion ||
    draw.winner ||
    draw.tournamentChampion ||
    draw.finalMatch?.winner ||
    null
  );
}

export default function MatchesManagementPage() {
  const [tournaments, setTournaments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [eligibleRegistrations, setEligibleRegistrations] = useState([]);
  const [draw, setDraw] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [positionsSaved, setPositionsSaved] = useState(false);
  const [awards, setAwards] = useState([]);
  const [scoreMatch, setScoreMatch] = useState(null);
  const [scoreGames, setScoreGames] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [listReloadKey, setListReloadKey] = useState(0);
  const [selectedBracketRound, setSelectedBracketRound] = useState("All");
  const [bracketZoom, setBracketZoom] = useState(1);
  const [participantSearch, setParticipantSearch] = useState("");
  const createDrawInProgress = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadLists() {
      setLoadingLists(true);
      setError("");
      try {
        const tournamentResult = await getTournaments({
          page: 1,
          pageSize: 100,
        });
        if (cancelled) return;
        const tournamentList = tournamentResult.tournaments;
        const firstTournament = tournamentList[0];
        const firstTournamentCategories = Array.isArray(
          firstTournament?.categories,
        )
          ? firstTournament.categories
          : [];
        setTournaments(tournamentList);
        setCategories(firstTournamentCategories);
        setSelectedTournamentId(String(firstTournament?.id ?? ""));
        setSelectedCategoryId(
          String(firstTournamentCategories[0]?.id ?? ""),
        );
      } catch (requestError) {
        if (!cancelled) {
          setError(messageFrom(requestError, "Unable to load tournaments and categories."));
        }
      } finally {
        if (!cancelled) setLoadingLists(false);
      }
    }

    loadLists();
    return () => {
      cancelled = true;
    };
  }, [listReloadKey]);

  useEffect(() => {
    if (!selectedCategoryId) {
      return undefined;
    }

    let cancelled = false;
    async function loadCategoryData() {
      setLoadingCategory(true);
      setError("");
      setActionError("");
      setNotice("");
      setAwards([]);
      try {
        const [registrations, draws] = await Promise.all([
          getEligibleRegistrations(selectedCategoryId),
          getCategoryDraws(selectedCategoryId),
        ]);
        if (cancelled) return;
        setEligibleRegistrations(registrations);
        const latestDraw = getLatestDraw(draws);
        setDraw(latestDraw);
        const initialAssignments = {};
        getDrawAssignments(latestDraw).forEach((assignment) => {
          const registrationId =
            assignment.registrationId ??
            assignment.registration?.id ??
            assignment.registration?.registrationId;
          const position =
            assignment.bracketPosition ?? assignment.position;
          if (registrationId != null && position != null) {
            initialAssignments[String(registrationId)] = String(position);
          }
        });
        const initialPositions = registrations.map((registration) =>
          Number(initialAssignments[String(getRegistrationId(registration))]),
        );
        const initialPositionLimit = Math.max(
          2,
          2 ** Math.ceil(Math.log2(Math.max(registrations.length, 2))),
        );
        setPositionsSaved(
          registrations.length >= 2 &&
            initialPositions.every(
              (position) =>
                Number.isInteger(position) &&
                position > 0 &&
                position <= initialPositionLimit,
            ) &&
            new Set(initialPositions).size === registrations.length,
        );
        setAssignments(initialAssignments);
      } catch (requestError) {
        if (!cancelled) {
          setError(messageFrom(requestError, "Unable to load draw data."));
          setEligibleRegistrations([]);
          setDraw(null);
          setAssignments({});
          setPositionsSaved(false);
        }
      } finally {
        if (!cancelled) setLoadingCategory(false);
      }
    }

    loadCategoryData();
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId, reloadKey]);

  const selectedTournament = tournaments.find(
    (tournament) => String(tournament.id) === selectedTournamentId,
  );
  const selectedCategory = categories.find(
    (category) => String(category.id) === selectedCategoryId,
  );
  const bestOfGames = getBestOfGameCount(selectedCategory?.matchFormat);
  const gamesToWin = bestOfGames ? Math.ceil(bestOfGames / 2) : null;
  const maxScoreGames = bestOfGames ?? 5;
  const drawFormat =
    selectedCategory?.drawConfiguration?.drawFormat ??
    selectedCategory?.drawFormat ??
    selectedCategory?.seeds ??
    draw?.drawConfiguration?.drawFormat ??
    draw?.drawFormat ??
    draw?.format ??
    "";
  const drawFormatLabel = drawFormat
    ? String(drawFormat)
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Single Elimination";
  const isDoubleElimination = /double[\s_-]*elimination/i.test(
    String(drawFormat),
  );
  const matches = useMemo(() => flattenMatches(draw), [draw]);
  const registrationsById = useMemo(
    () =>
      new Map(
        eligibleRegistrations
          .map((registration) => [
            String(getRegistrationId(registration)),
            getRegistrationName(registration),
          ])
          .filter(([id]) => id !== "null"),
      ),
    [eligibleRegistrations],
  );
  const registrationsByPosition = useMemo(() => {
    const registrations = new Map();
    Object.entries(assignments).forEach(([registrationId, position]) => {
      const name = registrationsById.get(registrationId);
      if (name && Number(position) > 0) {
        registrations.set(String(Number(position)), name);
      }
    });
    return registrations;
  }, [assignments, registrationsById]);
  const visibleEligibleRegistrations = useMemo(() => {
    const query = participantSearch.trim().toLowerCase();
    if (!query) return eligibleRegistrations;
    return eligibleRegistrations.filter((registration) => {
      const name = getRegistrationName(registration).toLowerCase();
      const registrationId = String(getRegistrationId(registration));
      return name.includes(query) || registrationId.includes(query);
    });
  }, [eligibleRegistrations, participantSearch]);
  const rounds = useMemo(() => {
    const grouped = new Map();
    matches.forEach((match) => {
      const name = getRoundName(match);
      const section = isDoubleElimination
        ? getDoubleEliminationSection(name, [match])
        : null;
      const key = isDoubleElimination ? `${section}\0${name}` : name;
      if (!grouped.has(key)) {
        grouped.set(key, { name, section, matches: [] });
      }
      grouped.get(key).matches.push(match);
    });
    const groups = [...grouped.values()];
    const groupCounts = new Map();
    groups.forEach(({ name }) => {
      groupCounts.set(name, (groupCounts.get(name) || 0) + 1);
    });
    const sectionLabels = {
      winners: "Winners",
      losers: "Losers",
      finals: "Finals",
      other: "Other",
    };
    return groups.map(({ name, section, matches: roundMatches }) => [
      isDoubleElimination && groupCounts.get(name) > 1
        ? `${name} · ${sectionLabels[section] || "Other"}`
        : name,
      roundMatches,
      section,
    ]);
  }, [isDoubleElimination, matches]);
  const doubleEliminationSections = useMemo(() => {
    const sectionConfig = [
      {
        id: "winners",
        title: "Winners bracket",
        description: "Rounds for players who have not yet lost.",
      },
      {
        id: "losers",
        title: "Losers bracket",
        description: "Rounds where players continue after a loss.",
      },
      {
        id: "finals",
        title: "Finals",
        description: "Championship matches.",
      },
      {
        id: "other",
        title: "Other stages",
        description: "Rounds not identified as winners, losers, or finals.",
      },
    ];
    const byId = new Map(
      sectionConfig.map((section) => [section.id, { ...section, rounds: [] }]),
    );
    rounds.forEach(([roundName, roundMatches, section]) => {
      const sectionId = section || "other";
      byId.get(sectionId).rounds.push([roundName, roundMatches]);
    });
    return sectionConfig
      .map((section) => byId.get(section.id))
      .filter((section) => section.rounds.length > 0);
  }, [rounds]);

  const drawId = getDrawId(draw);
  const drawRegistrationIds = getDrawRegistrationIds(draw);
  const eligibleRegistrationIds = eligibleRegistrations
    .map((registration) => getRegistrationId(registration))
    .filter((id) => id != null)
    .map(String);
  const drawStatus = String(
    draw?.status || draw?.drawStatus || (draw ? "DRAFT" : ""),
  ).toLowerCase();
  const isPublished =
    Boolean(draw?.publishedAt) ||
    draw?.published === true ||
    ["published", "in_progress", "completed", "finalized"].includes(drawStatus);
  const drawRegistrationSetChanged =
    drawRegistrationIds !== null &&
    (drawRegistrationIds.length !== eligibleRegistrationIds.length ||
      eligibleRegistrationIds.some(
        (registrationId) => !drawRegistrationIds.includes(registrationId),
      ));
  const isFinalized =
    draw?.finalized === true ||
    Boolean(draw?.finalizedAt || draw?.resultsFinalizedAt) ||
    ["finalized", "results_finalized"].includes(drawStatus);
  const positionLimit = Math.max(
    2,
    2 ** Math.ceil(Math.log2(Math.max(eligibleRegistrations.length, 2))),
  );
  const assignedEntries = eligibleRegistrations
    .map((registration) => ({
      registrationId: getRegistrationId(registration),
      bracketPosition: Number(
        assignments[String(getRegistrationId(registration))],
      ),
    }))
    .filter(
      (assignment) =>
        assignment.registrationId != null &&
        Number.isInteger(assignment.bracketPosition) &&
        assignment.bracketPosition > 0,
    );
  const assignedPositions = assignedEntries.map(
    (assignment) => assignment.bracketPosition,
  );
  const hasCompleteUniqueAssignments =
    eligibleRegistrations.length >= 2 &&
    assignedEntries.length === eligibleRegistrations.length &&
    new Set(assignedPositions).size === assignedPositions.length &&
    assignedPositions.every((position) => position <= positionLimit);
  const occupiedPositions = new Set(assignedPositions);
  const emptyFirstRoundPairs = Array.from(
    { length: positionLimit / 2 },
    (_, index) => [index * 2 + 1, index * 2 + 2],
  ).filter(
    ([firstPosition, secondPosition]) =>
      !occupiedPositions.has(firstPosition) &&
      !occupiedPositions.has(secondPosition),
  );
  const canAssignAndPublish =
    hasCompleteUniqueAssignments && emptyFirstRoundPairs.length === 0;
  const canPublishCurrentDraft =
    canAssignAndPublish && !drawRegistrationSetChanged;

  function getAssignmentErrorMessage() {
    if (
      hasCompleteUniqueAssignments &&
      emptyFirstRoundPairs.length > 0
    ) {
      const emptyMatches = emptyFirstRoundPairs
        .map(([first, second]) => `${first}–${second}`)
        .join(", ");
      return `Both positions are empty in first-round match(es) ${emptyMatches}. Move a player into one position in each pair to create byes.`;
    }
    return `Assign each confirmed registration to a unique bracket position between 1 and ${positionLimit}.`;
  }

  const allMatchesComplete =
    matches.length > 0 && matches.every(isMatchComplete);

  function handleCategoryChange(nextCategoryId) {
    setSelectedCategoryId(nextCategoryId);
    setSelectedBracketRound("All");
    setEligibleRegistrations([]);
    setDraw(null);
    setAssignments({});
    setPositionsSaved(false);
    setAwards([]);
    setError("");
    setActionError("");
    setNotice("");
  }

  function handleTournamentChange(nextTournamentId) {
    setSelectedTournamentId(nextTournamentId);
    setSelectedBracketRound("All");
    const tournament = tournaments.find(
      (item) => String(item.id) === String(nextTournamentId),
    );
    const tournamentCategories = Array.isArray(tournament?.categories)
      ? tournament.categories
      : [];
    setCategories(tournamentCategories);
    setSelectedCategoryId(
      String(tournamentCategories[0]?.id ?? ""),
    );
    setEligibleRegistrations([]);
    setDraw(null);
    setAssignments({});
    setPositionsSaved(false);
    setAwards([]);
    setError("");
    setActionError("");
    setNotice("");
  }

  async function refreshDraw(id = drawId) {
    if (!id) {
      setReloadKey((key) => key + 1);
      return;
    }
    const freshDraw = unwrapDraw(
      await getCategoryDraw(selectedCategoryId, id),
    );
    setDraw(freshDraw);
    const freshAssignments = {};
    getDrawAssignments(freshDraw).forEach((assignment) => {
      const registrationId =
        assignment.registrationId ?? assignment.registration?.id;
      const position = assignment.bracketPosition ?? assignment.position;
      if (registrationId != null && position != null) {
        freshAssignments[String(registrationId)] = String(position);
      }
    });
    setAssignments(freshAssignments);
    const assignedPositions = eligibleRegistrations.map((registration) =>
      Number(freshAssignments[String(getRegistrationId(registration))]),
    );
    const currentPositionLimit = Math.max(
      2,
      2 ** Math.ceil(Math.log2(Math.max(eligibleRegistrations.length, 2))),
    );
    setPositionsSaved(
      eligibleRegistrations.length >= 2 &&
        assignedPositions.every(
          (position) =>
            Number.isInteger(position) &&
            position > 0 &&
            position <= currentPositionLimit,
        ) &&
        new Set(assignedPositions).size === eligibleRegistrations.length,
    );
  }

  async function handleCreateDraw() {
    if (
      createDrawInProgress.current ||
      !selectedCategoryId ||
      loadingCategory ||
      eligibleRegistrations.length < 2 ||
      isFinalized
    ) {
      if (isFinalized) {
        setActionError(
          "Results are finalized for this category. A new draft cannot be created.",
        );
      }
      return;
    }

    createDrawInProgress.current = true;
    setBusyAction("create");
    setActionError("");
    setNotice("");
    try {
      const created = unwrapDraw(
        await createCategoryDraw(selectedCategoryId),
      );
      const createdId = getDrawId(created);
      if (createdId != null) {
        setDraw(created);
        setPositionsSaved(false);
        const createdAssignments = {};
        getDrawAssignments(created).forEach((assignment) => {
          const registrationId =
            assignment.registrationId ?? assignment.registration?.id;
          const position =
            assignment.bracketPosition ?? assignment.position;
          if (registrationId != null && position != null) {
            createdAssignments[String(registrationId)] = String(position);
          }
        });
        setAssignments(createdAssignments);
        await refreshDraw(createdId);
      } else {
        setReloadKey((key) => key + 1);
      }
      setNotice("Draft draw created.");
    } catch (requestError) {
      setActionError(messageFrom(requestError, "Unable to create the draw."));
    } finally {
      createDrawInProgress.current = false;
      setBusyAction("");
    }
  }

  async function handleSaveAssignments() {
    if (!drawId) return;
    if (eligibleRegistrations.length < 2) {
      setActionError(
        "A draw needs at least two confirmed registrations.",
      );
      return;
    }
    if (drawRegistrationSetChanged) {
      setActionError(
        "This draft snapshots a different registration set. Create a new draft before assigning positions.",
      );
      return;
    }
    if (!canAssignAndPublish) {
      setActionError(getAssignmentErrorMessage());
      return;
    }

    setBusyAction("assign");
    setActionError("");
    setNotice("");
    try {
      await assignDrawPositions(drawId, assignedEntries);
      setPositionsSaved(true);
      await refreshDraw();
      setNotice("Bracket positions saved.");
    } catch (requestError) {
      setActionError(messageFrom(requestError, "Unable to save bracket positions."));
    } finally {
      setBusyAction("");
    }
  }

  function handleAutoAssign() {
    if (eligibleRegistrations.length < 2) {
      setActionError(
        "A draw needs at least two confirmed registrations before positions can be assigned.",
      );
      return;
    }
    if (drawRegistrationSetChanged) {
      setActionError(
        "This draft snapshots a different registration set. Create a new draft before assigning positions.",
      );
      return;
    }
    if (eligibleRegistrations.some((registration) => getRegistrationId(registration) == null)) {
      setActionError(
        "A registration is missing its registration ID, so positions cannot be assigned safely.",
      );
      return;
    }
    if (
      Object.keys(assignments).length > 0 &&
      !window.confirm(
        "Auto-assign will replace all current bracket positions with a randomized assignment. Continue?",
      )
    ) {
      return;
    }

    setAssignments(createAutoAssignments(eligibleRegistrations, positionLimit));
    setPositionsSaved(false);
    setActionError("");
    const byeCount = positionLimit - eligibleRegistrations.length;
    setNotice(
      `Randomly assigned ${eligibleRegistrations.length} registrations across ${positionLimit} positions with ${byeCount} first-round bye${byeCount === 1 ? "" : "s"}. Save positions or publish to apply them.`,
    );
  }

  async function handlePublishDraw() {
    if (!drawId) {
      setActionError("Select a category with a draft draw before publishing.");
      return;
    }
    if (eligibleRegistrations.length < 2) {
      setActionError(
        "A draw needs at least two confirmed registrations.",
      );
      return;
    }
    if (drawRegistrationSetChanged) {
      setActionError(
        "This draft snapshots a different registration set. Create a new draft before publishing.",
      );
      return;
    }
    if (!canAssignAndPublish) {
      setActionError(getAssignmentErrorMessage());
      return;
    }

    setBusyAction("publish");
    setActionError("");
    setNotice("");
    try {
      if (!positionsSaved) {
        await assignDrawPositions(drawId, assignedEntries);
        setPositionsSaved(true);
      }
      await publishCategoryDraw(drawId);
      await refreshDraw();
      setNotice("Draw published.");
    } catch (requestError) {
      setActionError(messageFrom(requestError, "Unable to publish the draw."));
    } finally {
      setBusyAction("");
    }
  }

  async function handleLoadAwards() {
    setBusyAction("awards");
    setActionError("");
    try {
      const result = await getCategoryRankingPointAwards(selectedCategoryId);
      setAwards(result);
      setNotice("Ranking-point awards loaded.");
    } catch (requestError) {
      setActionError(messageFrom(requestError, "Unable to load ranking-point awards."));
    } finally {
      setBusyAction("");
    }
  }

  async function handleFinalize() {
    if (!drawId) return;
    setBusyAction("finalize");
    setActionError("");
    setNotice("");
    try {
      await finalizeCategoryDraw(drawId);
      await refreshDraw();
      const result = await getCategoryRankingPointAwards(selectedCategoryId);
      setAwards(result);
      setNotice("Results finalized and ranking-point awards loaded.");
    } catch (requestError) {
      setActionError(messageFrom(requestError, "Unable to finalize tournament results."));
    } finally {
      setBusyAction("");
    }
  }

  function openScoreEditor(match) {
    if (!isMatchPlayable(match, registrationsById, registrationsByPosition)) {
      setActionError(
        isByeMatch(match)
          ? "This match is a bye; the player advances automatically."
          : "This match is waiting for its players to advance from earlier rounds.",
      );
      return;
    }

    const existingGames = getMatchGames(match);
    setScoreGames(
      existingGames.length
        ? existingGames
        : Array.from({ length: bestOfGames ?? 3 }, (_, index) => ({
            gameNumber: index + 1,
            participant1Score: "",
            participant2Score: "",
          })),
    );
    setScoreMatch(match);
    setActionError("");
  }

  async function handleSaveMatchResult() {
    if (!scoreMatch || !drawId) return;
    const startedGames = scoreGames.filter(
      (game) =>
        game.participant1Score !== "" || game.participant2Score !== "",
    );
    if (
      startedGames.some(
        (game) =>
          game.participant1Score === "" || game.participant2Score === "",
      )
    ) {
      setActionError(
        "Enter both participant scores for every game you have started.",
      );
      return;
    }
    if (
      scoreGames.some((game, index) => {
        const isBlank =
          game.participant1Score === "" && game.participant2Score === "";
        const hasLaterScore = scoreGames
          .slice(index + 1)
          .some(
            (laterGame) =>
              laterGame.participant1Score !== "" ||
              laterGame.participant2Score !== "",
          );
        return isBlank && hasLaterScore;
      })
    ) {
      setActionError("Enter game scores in order without skipping a game.");
      return;
    }
    const games = startedGames.map((game, index) => ({
      gameNumber: index + 1,
      participant1Score: Number(game.participant1Score),
      participant2Score: Number(game.participant2Score),
    }));

    if (
      games.length === 0 ||
      games.some(
        (game) =>
          !Number.isInteger(game.participant1Score) ||
          !Number.isInteger(game.participant2Score) ||
          game.participant1Score < 0 ||
          game.participant2Score < 0 ||
          game.participant1Score === game.participant2Score,
      )
    ) {
      setActionError("Enter a non-negative, non-tied score for each game.");
      return;
    }
    const invalidGameIndex = games.findIndex(
      (game) => getBadmintonGameWinner(game) == null,
    );
    if (invalidGameIndex >= 0) {
      setActionError(
        `Game ${invalidGameIndex + 1} must be won to at least 21 points by 2, with a maximum score of 30.`,
      );
      return;
    }
    if (gamesToWin != null) {
      let participant1Wins = 0;
      let participant2Wins = 0;
      for (let index = 0; index < games.length; index += 1) {
        const winner = getBadmintonGameWinner(games[index]);
        if (winner === 1) participant1Wins += 1;
        if (winner === 2) participant2Wins += 1;
        if (
          Math.max(participant1Wins, participant2Wins) >= gamesToWin &&
          index < games.length - 1
        ) {
          setActionError(
            "Do not enter additional games after a player has won the match.",
          );
          return;
        }
      }
      if (Math.max(participant1Wins, participant2Wins) < gamesToWin) {
        setActionError(
          `Enter enough games for one player to win ${gamesToWin} game${gamesToWin === 1 ? "" : "s"}.`,
        );
        return;
      }
    }

    const matchId = scoreMatch.id ?? scoreMatch.matchId;
    if (matchId == null) {
      setActionError("This match has no ID; the result cannot be saved.");
      return;
    }
    setBusyAction("score");
    setActionError("");
    setNotice("");
    try {
      await updateMatchResult(drawId, matchId, games);
      await refreshDraw();
      setScoreMatch(null);
      setNotice(
        "Match result saved. The draw refreshed, and the winner advances automatically.",
      );
    } catch (requestError) {
      setActionError(messageFrom(requestError, "Unable to save match result."));
    } finally {
      setBusyAction("");
    }
  }

  const statusLabel = isFinalized
    ? "Finalized"
    : isPublished
      ? "Published"
      : draw
        ? "Draft"
        : "No draw";

  function renderBracketMatch(match, index, roundName, compact = false) {
    const matchId = match.id ?? match.matchId ?? index + 1;
    const sourceRoundIndex = rounds.findIndex(
      ([sourceRoundName]) => sourceRoundName === roundName,
    );
    const first = getParticipant(
      match,
      1,
      registrationsById,
      registrationsByPosition,
    );
    const second = getParticipant(
      match,
      2,
      registrationsById,
      registrationsByPosition,
    );
    const canPlayMatch = isMatchPlayable(
      match,
      registrationsById,
      registrationsByPosition,
    );
    const firstPosition =
      getParticipantBracketPosition(match, 1, assignments) ??
      (sourceRoundIndex === 0 ? index * 2 + 1 : null);
    const secondPosition =
      getParticipantBracketPosition(match, 2, assignments) ??
      (sourceRoundIndex === 0 ? index * 2 + 2 : null);
    const winnerSide = getWinnerSide(match);
    const isExplicitBye = isByeMatch(match);
    const firstDisplayLabel =
      firstPosition == null ? first : `#${firstPosition} ${first}`;
    const secondLabel = isExplicitBye ? "BYE" : second;
    const secondDisplayLabel =
      secondPosition == null ? secondLabel : `#${secondPosition} ${secondLabel}`;
    const canOpenScore =
      isPublished && canPlayMatch && !isFinalized;

    return (
      <article
        key={`${roundName}-${matchId}-${index}`}
        role={canOpenScore ? "button" : undefined}
        tabIndex={canOpenScore ? 0 : undefined}
        aria-label={canOpenScore ? `Enter result for match ${matchId}` : undefined}
        onClick={() => canOpenScore && openScoreEditor(match)}
        onKeyDown={(event) => {
          if (
            canOpenScore &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            openScoreEditor(match);
          }
        }}
        style={{
          height: compact ? "auto" : `${BRACKET_MATCH_HEIGHT}px`,
          minHeight: compact ? `${BRACKET_MATCH_HEIGHT}px` : undefined,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          padding: compact ? "6px" : 0,
          border: compact ? "1px solid #dbe3eb" : "none",
          borderRadius: compact ? "8px" : 0,
          backgroundColor: compact ? "#ffffff" : "transparent",
          boxShadow: compact ? "0 1px 3px rgba(15,23,42,0.06)" : "none",
          cursor: canOpenScore ? "pointer" : "default",
        }}
      >
        {compact && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "8px",
              color: "#64748b",
              fontSize: "10px",
              fontWeight: 700,
            }}
          >
            <span>Match #{matchId}</span>
            <span>{getMatchStatus(match)}</span>
          </div>
        )}
        {[firstDisplayLabel, secondDisplayLabel].map(
          (label, participantIndex) => (
            <div
              key={`${participantIndex}-${label}`}
              style={{
                height: "32px",
                flex: "0 0 32px",
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                padding: "0 8px",
                borderRadius: "4px",
                backgroundColor:
                  winnerSide === participantIndex + 1 ? "#86efac" : "#536b7e",
                color: winnerSide === participantIndex + 1 ? "#14532d" : "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                overflow: "hidden",
              }}
              title={`Match #${matchId}: ${label}`}
            >
              <span
                style={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                  overflow: "hidden",
                  overflowWrap: "anywhere",
                  lineHeight: "14px",
                }}
              >
                {winnerSide === participantIndex + 1 ? "✓ " : ""}
                {label}
              </span>
            </div>
          ),
        )}
      </article>
    );
  }

  return (
    <main
      style={{
        padding: "24px",
        backgroundColor: "#f8fafc",
        minHeight: "calc(100vh - 75px)",
        boxSizing: "border-box",
        color: "#0f172a",
        fontFamily: "sans-serif",
      }}
    >
      <section
        style={{
          marginBottom: "20px",
          border: "1px solid #1e3a52",
          borderRadius: "14px",
          background:
            "linear-gradient(135deg, #0D1B2A 0%, #12283a 68%, #172f45 100%)",
          color: "#ffffff",
          padding: "20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            minWidth: "260px",
            flex: "1 1 420px",
          }}
        >
          <div
            style={{
              width: "58px",
              height: "58px",
              borderRadius: "12px",
              background: "#EF3340",
              display: "grid",
              placeItems: "center",
              fontSize: "22px",
              fontWeight: 900,
              boxShadow: "0 10px 24px rgba(239,51,64,0.22)",
            }}
          >
            NYX
          </div>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <h1 style={{ margin: 0, fontSize: "20px", letterSpacing: "-0.02em" }}>
                {selectedTournament?.title || "Tournament Bracket"}
              </h1>
              <span
                style={{
                  borderRadius: "999px",
                  backgroundColor: "#ef3340",
                  padding: "4px 8px",
                  fontSize: "10px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                {statusLabel}
              </span>
            </div>
            <p
              style={{
                margin: "7px 0 0",
                color: "#b8c5d1",
                fontSize: "12px",
              }}
            >
              {selectedCategory?.categoryName ||
                selectedCategory?.name ||
                "Select a category"}{" "}
              · {drawFormatLabel} · {eligibleRegistrations.length} eligible
              registrations
              · {formatTournamentDate(selectedTournament)}
            </p>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <label style={{ color: "#cbd5e1", fontSize: "11px", fontWeight: 700 }}>
            Tournament
            <select
              value={selectedTournamentId}
              onChange={(event) => handleTournamentChange(event.target.value)}
              disabled={loadingLists}
              style={{
                ...inputStyle,
                minWidth: "180px",
                marginTop: "5px",
                backgroundColor: "#102235",
                color: "#ffffff",
                border: "1px solid #355167",
              }}
            >
              <option value="">Select tournament</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.title}
                </option>
              ))}
            </select>
          </label>
          <label style={{ color: "#cbd5e1", fontSize: "11px", fontWeight: 700 }}>
            Category
            <select
              value={selectedCategoryId}
              onChange={(event) => handleCategoryChange(event.target.value)}
              disabled={loadingLists}
              style={{
                ...inputStyle,
                minWidth: "190px",
                marginTop: "5px",
                backgroundColor: "#102235",
                color: "#ffffff",
                border: "1px solid #355167",
              }}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.categoryName || category.name} (
                  {category.categoryCode})
                </option>
              ))}
            </select>
          </label>
          {draw && !isPublished && (
            <button
              type="button"
              onClick={handlePublishDraw}
              disabled={
                busyAction !== "" ||
                loadingCategory
              }
              style={{
                ...buttonStyle,
                marginTop: "18px",
                backgroundColor: "#EF3340",
              }}
            >
              {busyAction === "publish" ? "Publishing…" : "Publish Bracket"}
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              selectedCategoryId
                ? setReloadKey((key) => key + 1)
                : setListReloadKey((key) => key + 1)
            }
            disabled={loadingLists || loadingCategory}
            style={{
              ...buttonStyle,
              marginTop: "18px",
              backgroundColor: "#1b3448",
              border: "1px solid #355167",
            }}
          >
            <RefreshIcon fontSize="small" />
          </button>
        </div>
      </section>

      {loadingLists && <p role="status">Loading tournaments and categories…</p>}
      {loadingCategory && <p role="status">Loading eligible registrations and draw…</p>}
      {error && (
        <div role="alert" style={{ ...cardStyle, color: "#b91c1c" }}>
          {error}
          <button
            type="button"
            onClick={() =>
              selectedCategoryId
                ? setReloadKey((key) => key + 1)
                : setListReloadKey((key) => key + 1)
            }
            style={{ ...buttonStyle, marginLeft: "12px" }}
          >
            Retry
          </button>
        </div>
      )}
      {actionError && (
        <div role="alert" style={{ ...cardStyle, color: "#b91c1c" }}>
          {actionError}
        </div>
      )}
      {notice && (
        <div
          role="status"
          style={{
            ...cardStyle,
            padding: "12px 16px",
            color: "#166534",
            backgroundColor: "#f0fdf4",
          }}
        >
          {notice}
        </div>
      )}

      {!loadingLists && !error && !selectedCategoryId && (
        <section style={cardStyle}>
          <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
            No categories are available. Add tournament categories before
            managing draws.
          </p>
        </section>
      )}

      {!loadingLists && !loadingCategory && selectedCategoryId && !error && (
        <>
          <section style={cardStyle}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div>
                <h2 style={{ margin: "0 0 5px", fontSize: "17px" }}>
                  Eligible registrations
                </h2>
                <p style={{ margin: 0, color: "#64748b", fontSize: "12px" }}>
                  {eligibleRegistrations.length} confirmed registration
                  {eligibleRegistrations.length === 1 ? "" : "s"}
                </p>
              </div>
              <input
                type="search"
                value={participantSearch}
                onChange={(event) => setParticipantSearch(event.target.value)}
                placeholder="Search participant or registration"
                style={{
                  ...inputStyle,
                  maxWidth: "260px",
                  marginRight: "auto",
                  marginLeft: "14px",
                }}
              />
              {(!draw || isPublished || drawRegistrationSetChanged) &&
                !isFinalized && (
                  <button
                    type="button"
                    onClick={handleCreateDraw}
                    disabled={
                      busyAction !== "" ||
                      loadingCategory ||
                      eligibleRegistrations.length < 2
                    }
                    style={buttonStyle}
                  >
                    <AddIcon style={{ fontSize: "16px", verticalAlign: "middle" }} />{" "}
                    {busyAction === "create"
                      ? "Creating…"
                      : isPublished || drawRegistrationSetChanged
                        ? "Create draft for current entries"
                        : "Create draft once"}
                  </button>
                )}
            </div>
            {draw && !isPublished && (
              <p
                style={{
                  color: "#64748b",
                  fontSize: "12px",
                  margin: "-4px 0 14px",
                }}
              >
                {drawRegistrationSetChanged
                  ? `This draft snapshots ${drawRegistrationIds.length} registrations, while ${eligibleRegistrationIds.length} are currently eligible. Create a new draft before assigning positions.`
                  : "A draft snapshots the confirmed registrations. If that set has changed, create a new draft before assigning positions."}
              </p>
            )}
            {draw && !isPublished && eligibleRegistrations.length >= 2 && (
              <p
                style={{
                  color: "#64748b",
                  fontSize: "12px",
                  margin: "-4px 0 14px",
                }}
              >
                Assign each registration ID (not a member or user ID) to a
                unique position from 1 to {positionLimit}. Positions 1–2 pair
                in the first match, 3–4 in the second; empty positions become
                byes.
              </p>
            )}
            {draw &&
              !isPublished &&
              hasCompleteUniqueAssignments &&
              emptyFirstRoundPairs.length > 0 && (
                <p
                  role="alert"
                  style={{
                    color: "#b91c1c",
                    fontSize: "12px",
                    margin: "-4px 0 14px",
                  }}
                >
                  Positions{" "}
                  {emptyFirstRoundPairs
                    .map(([first, second]) => `${first}–${second}`)
                    .join(", ")}{" "}
                  are both empty. Move a player into one position in each
                  pair; otherwise those matches cannot advance anyone.
                </p>
              )}
            {draw && isFinalized && (
              <p
                role="status"
                style={{
                  color: "#166534",
                  fontSize: "12px",
                  margin: "-4px 0 14px",
                }}
              >
                Results are finalized for this category. No further drafts can
                be created.
              </p>
            )}
            {draw && isPublished && !isFinalized && (
              <p
                style={{
                  color: "#64748b",
                  fontSize: "12px",
                  margin: "-4px 0 14px",
                }}
              >
                {drawRegistrationSetChanged
                  ? `This published draw has ${drawRegistrationIds.length} registrations, while ${eligibleRegistrationIds.length} are currently eligible. Create a new draft to include the current registration set.`
                  : "The published draw is a snapshot of its original registrations. Create a new draft if the confirmed registration set has changed."}
              </p>
            )}
            {eligibleRegistrations.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "13px" }}>
                No eligible registrations were returned for this category.
              </p>
            ) : eligibleRegistrations.length < 2 ? (
              <p style={{ color: "#64748b", fontSize: "13px" }}>
                At least two confirmed registrations are required before
                creating a draft draw.
              </p>
            ) : (
              <div
                style={{
                  maxHeight: "420px",
                  overflow: "auto",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        color: "#64748b",
                        backgroundColor: "#f8fafc",
                        position: "sticky",
                        top: 0,
                        zIndex: 1,
                      }}
                    >
                      <th style={{ padding: "11px", width: "52px" }}>NO.</th>
                      <th style={{ padding: "11px" }}>REGISTRATION ID</th>
                      <th style={{ padding: "11px" }}>PLAYER / TEAM</th>
                      {draw && !isPublished && (
                        <th style={{ padding: "11px", width: "190px" }}>
                          BRACKET POSITION
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEligibleRegistrations.map((registration, index) => {
                      const registrationId = getRegistrationId(registration);
                      const key = String(registrationId);
                      return (
                        <tr
                          key={key}
                          style={{ borderTop: "1px solid #e2e8f0" }}
                        >
                          <td style={{ padding: "12px 11px" }}>
                            {index + 1}
                          </td>
                          <td style={{ padding: "12px 11px" }}>
                            #{registrationId}
                          </td>
                          <td style={{ padding: "12px 11px" }}>
                            <strong>{getRegistrationName(registration)}</strong>
                            {getRegistrationDetail(registration) && (
                              <div
                                style={{
                                  marginTop: "3px",
                                  color: "#64748b",
                                  fontSize: "11px",
                                }}
                              >
                                {getRegistrationDetail(registration)}
                              </div>
                            )}
                          </td>
                          {draw && !isPublished && (
                            <td style={{ padding: "8px 11px" }}>
                              <select
                                value={assignments[key] || ""}
                                onChange={(event) => {
                                  setPositionsSaved(false);
                                  setAssignments((current) => ({
                                    ...current,
                                    [key]: event.target.value,
                                  }));
                                }}
                                disabled={drawRegistrationSetChanged}
                                style={inputStyle}
                              >
                                <option value="">Not assigned</option>
                                {Array.from(
                                  { length: positionLimit },
                                  (_, index) => index + 1,
                                )
                                  .filter(
                                    (position) =>
                                      Number(assignments[key]) === position ||
                                      !Object.entries(assignments).some(
                                        ([
                                          assignedRegistrationId,
                                          assignedPosition,
                                        ]) =>
                                          assignedRegistrationId !== key &&
                                          Number(assignedPosition) === position,
                                      ),
                                  )
                                  .map((position) => (
                                    <option
                                      key={position}
                                      value={position}
                                    >
                                      Position {position}
                                    </option>
                                  ))}
                              </select>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {draw && !isPublished && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "16px",
                }}
              >
                <button
                  type="button"
                  onClick={handleAutoAssign}
                  disabled={busyAction !== "" || loadingCategory}
                  style={{ ...buttonStyle, backgroundColor: "#334155" }}
                >
                  Auto-assign positions
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssignments}
                  disabled={
                    busyAction !== "" || !canPublishCurrentDraft
                  }
                  style={buttonStyle}
                >
                  {busyAction === "assign"
                    ? "Saving positions…"
                    : "Save complete assignment"}
                </button>
                <button
                  type="button"
                  onClick={handlePublishDraw}
                  disabled={
                    busyAction !== "" || loadingCategory
                  }
                  style={{ ...buttonStyle, backgroundColor: "#15803d" }}
                >
                  {busyAction === "publish" ? "Publishing…" : "Publish draw"}
                </button>
                <span style={{ color: "#64748b", fontSize: "11px" }}>
                  Auto-assign randomizes players and spreads byes across
                  separate first-round matches. Saving replaces all positions
                  currently stored for this draw.
                </span>
              </div>
            )}
          </section>

          {draw && (
            <section
              style={{
                marginBottom: "10px",
                padding: "14px 16px 12px",
                border: "1px solid #dfe5ec",
                borderRadius: "12px",
                backgroundColor: "#ffffff",
                color: "#0f172a",
                boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "8px",
                }}
              >
                <div>
                  <h2 style={{ margin: "0 0 5px", fontSize: "17px", color: "#0f172a" }}>
                    Bracket rounds
                  </h2>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "12px" }}>
                    {isDoubleElimination
                      ? "Winners, losers, and finals are grouped into separate bracket lanes."
                      : "Bracket and match data loaded from the selected draw. Long player and team names wrap inside each match."}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <button
                    type="button"
                    onClick={() =>
                      setBracketZoom((zoom) =>
                        Math.max(0.75, Number((zoom - 0.1).toFixed(2))),
                      )
                    }
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      color: "#334155",
                      cursor: "pointer",
                    }}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => setBracketZoom(1)}
                    style={{
                      height: "32px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      color: "#334155",
                      padding: "0 10px",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    {Math.round(bracketZoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBracketZoom((zoom) =>
                        Math.min(1.25, Number((zoom + 0.1).toFixed(2))),
                      )
                    }
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      color: "#334155",
                      cursor: "pointer",
                    }}
                  >
                    +
                  </button>
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: "20px",
                      backgroundColor: isPublished ? "#123926" : "#3d3020",
                      color: isPublished ? "#86efac" : "#fcd34d",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>
              {rounds.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    overflowX: "auto",
                    paddingBottom: "6px",
                  }}
                >
                  <div style={{ display: "flex", gap: "7px" }}>
                    {["All", ...rounds.map(([roundName]) => roundName)].map(
                      (roundName) => (
                        <button
                          key={roundName}
                          type="button"
                          onClick={() => setSelectedBracketRound(roundName)}
                          style={{
                            border:
                              selectedBracketRound === roundName
                                ? "1px solid #EF3340"
                                : "1px solid #cbd5e1",
                            borderRadius: "999px",
                            backgroundColor:
                              selectedBracketRound === roundName
                                ? "#EF3340"
                                : "#ffffff",
                            color:
                              selectedBracketRound === roundName
                                ? "#ffffff"
                                : "#475569",
                            padding: "6px 10px",
                            whiteSpace: "nowrap",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {roundName}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}
              {rounds.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: "13px" }}>
                  No bracket matches are available yet. Assign positions and
                  publish the draw to generate the bracket.
                </p>
              ) : isDoubleElimination ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    padding: "6px 0",
                  }}
                >
                  {doubleEliminationSections.map((section) => {
                    const visibleRounds = section.rounds.filter(
                      ([roundName]) =>
                        selectedBracketRound === "All" ||
                        selectedBracketRound === roundName,
                    );
                    if (visibleRounds.length === 0) return null;

                    const sectionColor =
                      section.id === "winners"
                        ? "#15803d"
                        : section.id === "losers"
                          ? "#b45309"
                          : section.id === "finals"
                            ? "#ae1236"
                            : "#475569";

                    return (
                      <section
                        key={section.id}
                        aria-label={section.title}
                        style={{
                          minWidth: 0,
                          border: "1px solid #e2e8f0",
                          borderLeft: `4px solid ${sectionColor}`,
                          borderRadius: "10px",
                          backgroundColor: "#f8fafc",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 14px",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          <div>
                            <h3
                              style={{
                                margin: 0,
                                color: "#0f172a",
                                fontSize: "14px",
                              }}
                            >
                              {section.title}
                            </h3>
                            <p
                              style={{
                                margin: "3px 0 0",
                                color: "#64748b",
                                fontSize: "11px",
                              }}
                            >
                              {section.description}
                            </p>
                          </div>
                          <span
                            style={{
                              flex: "0 0 auto",
                              padding: "4px 8px",
                              borderRadius: "999px",
                              backgroundColor: "#ffffff",
                              color: sectionColor,
                              border: `1px solid ${sectionColor}33`,
                              fontSize: "10px",
                              fontWeight: 800,
                            }}
                          >
                            {visibleRounds.reduce(
                              (total, [, roundMatches]) =>
                                total + roundMatches.length,
                              0,
                            )}{" "}
                            matches
                          </span>
                        </div>
                        <div
                          style={{
                            overflowX: "auto",
                            padding: "12px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "12px",
                              transform: `scale(${bracketZoom})`,
                              transformOrigin: "top left",
                              width: `${100 / bracketZoom}%`,
                            }}
                          >
                            {visibleRounds.map(
                              ([roundName, roundMatches], roundIndex) => (
                                <div
                                  key={roundName}
                                  style={{
                                    flex: `0 0 ${BRACKET_COLUMN_WIDTH}px`,
                                    width: `${BRACKET_COLUMN_WIDTH}px`,
                                    minWidth: 0,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      minHeight: "30px",
                                      marginBottom: "8px",
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: "22px",
                                        height: "22px",
                                        flex: "0 0 22px",
                                        display: "grid",
                                        placeItems: "center",
                                        borderRadius: "50%",
                                        backgroundColor: `${sectionColor}14`,
                                        color: sectionColor,
                                        fontSize: "10px",
                                        fontWeight: 800,
                                      }}
                                    >
                                      {roundIndex + 1}
                                    </span>
                                    <strong
                                      style={{
                                        color: "#334155",
                                        fontSize: "11px",
                                        lineHeight: 1.3,
                                      }}
                                    >
                                      {roundName}
                                    </strong>
                                    <span
                                      style={{
                                        marginLeft: "auto",
                                        color: "#64748b",
                                        fontSize: "10px",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {roundMatches.length} matches
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "8px",
                                    }}
                                  >
                                    {roundMatches.map((match, index) =>
                                      renderBracketMatch(
                                        match,
                                        index,
                                        roundName,
                                        true,
                                      ),
                                    )}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "stretch",
                    gap: "0",
                    overflowX: "auto",
                    padding: "6px 8px 8px",
                    position: "relative",
                    transform: `scale(${bracketZoom})`,
                    transformOrigin: "top left",
                    width: `${100 / bracketZoom}%`,
                  }}
                >
                  {selectedBracketRound === "All" && (
                    <svg
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: "0",
                        width: "100%",
                        height: "100%",
                        pointerEvents: "none",
                        zIndex: 0,
                        overflow: "visible",
                      }}
                    >
                      {rounds.map(([roundName, roundMatches], roundIndex) => {
                        if (roundIndex >= rounds.length - 1) return null;
                        const nextRoundMatches =
                          rounds[roundIndex + 1]?.[1] || [];
                        const cardGap = getBracketMatchGap(roundIndex);
                        const nextCardGap = getBracketMatchGap(
                          roundIndex + 1,
                        );
                        const cardPitch = BRACKET_MATCH_HEIGHT + cardGap;
                        const nextCardPitch =
                          BRACKET_MATCH_HEIGHT + nextCardGap;
                        const roundPadding =
                          getBracketRoundPadding(roundIndex);
                        const nextRoundPadding =
                          getBracketRoundPadding(roundIndex + 1);
                        const sourceX =
                          8 +
                          roundIndex * BRACKET_TRACK_WIDTH +
                          BRACKET_COLUMN_WIDTH;
                        const targetX =
                          8 +
                          (roundIndex + 1) * BRACKET_TRACK_WIDTH;
                        const joinX = sourceX + 9;

                        return roundMatches
                          .filter((_, index) => index % 2 === 0)
                          .map((_, pairIndex) => {
                            const sourceIndex = pairIndex * 2;
                            const sourceMatch =
                              roundMatches[sourceIndex];
                            const pairedMatch =
                              roundMatches[sourceIndex + 1];
                            if (!sourceMatch && !pairedMatch) return null;

                            const firstY =
                              8 +
                              roundPadding +
                              sourceIndex * cardPitch +
                              BRACKET_MATCH_HEIGHT / 2;
                            const secondY =
                              8 +
                              roundPadding +
                              (sourceIndex + 1) * cardPitch +
                              BRACKET_MATCH_HEIGHT / 2;
                            const targetY =
                              8 +
                              nextRoundPadding +
                              pairIndex * nextCardPitch +
                              BRACKET_MATCH_HEIGHT / 2;
                            const topY = Math.min(firstY, secondY);
                            const bottomY =
                              pairedMatch == null
                                ? firstY
                                : Math.max(firstY, secondY);
                            const targetYWithinNext =
                              pairIndex < nextRoundMatches.length
                                ? targetY
                                : (topY + bottomY) / 2;

                            return (
                              <g
                                key={`${roundName}-connector-${pairIndex}`}
                                fill="none"
                                stroke="#94a3b8"
                                strokeWidth="1.5"
                                strokeLinecap="square"
                                strokeLinejoin="round"
                              >
                                <path d={`M ${sourceX} ${firstY} H ${joinX}`} />
                                {pairedMatch && (
                                  <path
                                    d={`M ${sourceX} ${secondY} H ${joinX}`}
                                  />
                                )}
                                {pairedMatch && (
                                  <path
                                    d={`M ${joinX} ${topY} V ${bottomY}`}
                                  />
                                )}
                                <path
                                  d={`M ${joinX} ${targetYWithinNext} H ${targetX}`}
                                />
                              </g>
                            );
                          });
                      })}
                    </svg>
                  )}
                  {rounds
                    .filter(
                      ([roundName]) =>
                        selectedBracketRound === "All" ||
                        selectedBracketRound === roundName,
                    )
                    .map(([roundName, roundMatches], roundIndex) => (
                      <div
                        key={roundName}
                        style={{
                          display: "flex",
                          alignItems: "stretch",
                          flex: `0 0 ${BRACKET_TRACK_WIDTH}px`,
                          width: `${BRACKET_TRACK_WIDTH}px`,
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            width: `${BRACKET_COLUMN_WIDTH}px`,
                            display: "flex",
                            flexDirection: "column",
                            gap: `${getBracketMatchGap(roundIndex)}px`,
                            paddingTop: `${getBracketRoundPadding(roundIndex)}px`,
                          }}
                        >
                          <h3
                            style={{
                              height: "18px",
                              margin: 0,
                              color: "#475569",
                              fontSize: "11px",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              position: "absolute",
                              transform: "translateY(-22px)",
                            }}
                          >
                            {roundName}
                          </h3>
                          {roundMatches.map((match, index) =>
                            renderBracketMatch(match, index, roundName),
                          )}
                        </div>
                        {selectedBracketRound === "All" &&
                          roundIndex <
                            rounds.filter(
                              () => selectedBracketRound === "All",
                            ).length -
                              1 && <div style={{ width: "18px", flex: "0 0 18px" }} />}
                      </div>
                    ))}
                </div>
              )}
            </section>
          )}

          {draw && (isFinalized || getChampion(draw)) && (() => {
            const champion = getChampion(draw);
            const championName =
              champion?.name ||
              champion?.athleteName ||
              champion?.player?.name ||
              champion?.user?.name ||
              (typeof champion === "string" ? champion : "Champion");
            const finalRoundMatch = [...matches].reverse().find((match) =>
              /final/i.test(getRoundName(match)),
            );
            const finalGames = finalRoundMatch
              ? getMatchGames(finalRoundMatch)
              : [];
            return (
              <section
                style={{
                  marginBottom: "20px",
                  borderRadius: "14px",
                  border: "1px solid #c6a24a",
                  background:
                    "linear-gradient(135deg, #172235 0%, #0D1B2A 70%)",
                  padding: "20px",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      backgroundColor: "#d9b44a",
                      color: "#0D1B2A",
                      fontSize: "28px",
                      fontWeight: 900,
                    }}
                  >
                    {championName
                      .split(/\s+/)
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <div
                      style={{
                        color: "#d9b44a",
                        fontSize: "10px",
                        fontWeight: 900,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      }}
                    >
                      Tournament Champion
                    </div>
                    <h2 style={{ margin: "4px 0 0", fontSize: "22px" }}>
                      {championName}
                    </h2>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#91a4b5", fontSize: "11px" }}>
                    {selectedTournament?.title || "Tournament"}
                  </div>
                  <div
                    style={{
                      marginTop: "5px",
                      fontFamily: "monospace",
                      fontSize: "16px",
                      fontWeight: 800,
                    }}
                  >
                    {finalGames.length
                      ? finalGames
                          .map(
                            (game) =>
                              `${game.participant1Score}-${game.participant2Score}`,
                          )
                          .join("  ")
                      : "Final score unavailable"}
                  </div>
                </div>
              </section>
            );
          })()}

          {draw && (
            <section
              style={{
                ...cardStyle,
                marginTop: "0",
                marginBottom: "10px",
                padding: "14px 16px",
              }}
            >
              <h2 style={{ margin: "0 0 10px", fontSize: "17px" }}>
                Match results
              </h2>
              {matches.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: "13px" }}>
                  No matches are available in this draw yet.
                </p>
              ) : (
                <div
                  style={{
                    maxHeight: "420px",
                    overflow: "auto",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      minWidth: "720px",
                      borderCollapse: "collapse",
                      textAlign: "left",
                      fontSize: "12px",
                    }}
                  >
                  <thead>
                    <tr
                      style={{
                        color: "#64748b",
                        backgroundColor: "#f8fafc",
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                      }}
                    >
                      <th style={{ padding: "12px" }}>MATCH</th>
                      <th style={{ padding: "12px" }}>ROUND</th>
                      <th style={{ padding: "12px" }}>PARTICIPANTS</th>
                      <th style={{ padding: "12px" }}>GAMES</th>
                      <th style={{ padding: "12px" }}>STATUS</th>
                      {isPublished && (
                        <th style={{ padding: "12px", textAlign: "right" }}>
                          ACTION
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((match, index) => {
                      const gameScores = getMatchGames(match);
                      const bye = isByeMatch(match);
                      const canPlayMatch = isMatchPlayable(
                        match,
                        registrationsById,
                        registrationsByPosition,
                      );
                      return (
                        <tr
                          key={match.id ?? match.matchId ?? index}
                          style={{ borderTop: "1px solid #e2e8f0" }}
                        >
                          <td style={{ padding: "12px" }}>
                            #{match.id ?? match.matchId ?? index + 1}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {getRoundName(match)}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {getParticipant(
                              match,
                              1,
                              registrationsById,
                              registrationsByPosition,
                            )}
                            {" vs "}
                            {getParticipant(
                              match,
                              2,
                              registrationsById,
                              registrationsByPosition,
                            )}
                          </td>
                          <td style={{ padding: "12px", fontFamily: "monospace" }}>
                            {gameScores.length
                              ? gameScores
                                  .map(
                                    (game) =>
                                      `${game.participant1Score}-${game.participant2Score}`,
                                  )
                                  .join(", ")
                              : "—"}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {String(
                              match.status || match.matchStatus || "pending",
                            ).toUpperCase()}
                          </td>
                          {isPublished && (
                            <td style={{ padding: "12px", textAlign: "right" }}>
                              <button
                                type="button"
                                onClick={() => openScoreEditor(match)}
                                disabled={
                                  busyAction !== "" ||
                                  isFinalized ||
                                  !canPlayMatch
                                }
                                title={
                                  bye
                                    ? "Bye matches advance automatically."
                                    : canPlayMatch
                                      ? "Enter the official match score."
                                      : "Waiting for players to advance from earlier rounds."
                                }
                                style={{
                                  ...buttonStyle,
                                  padding: "7px 10px",
                                }}
                              >
                                {bye
                                  ? "Bye · auto-advance"
                                  : !canPlayMatch
                                    ? "Awaiting players"
                                    : isMatchComplete(match)
                                      ? "Update result"
                                      : "Enter result"}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {draw && isPublished && (
            <section style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={
                    busyAction !== "" ||
                    isFinalized ||
                    !allMatchesComplete
                  }
                  style={{
                    ...buttonStyle,
                    backgroundColor: "#15803d",
                    opacity:
                      isFinalized || !allMatchesComplete ? 0.6 : 1,
                  }}
                >
                  {busyAction === "finalize"
                    ? "Finalizing…"
                    : isFinalized
                      ? "Results finalized"
                      : "Finalize tournament results"}
                </button>
                <button
                  type="button"
                  onClick={handleLoadAwards}
                  disabled={busyAction !== ""}
                  style={{
                    ...buttonStyle,
                    backgroundColor: "#f1f5f9",
                    color: "#334155",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  {busyAction === "awards"
                    ? "Loading awards…"
                    : "Load ranking-point awards"}
                </button>
                {!allMatchesComplete && !isFinalized && (
                  <span style={{ color: "#64748b", fontSize: "12px" }}>
                    Enter results for all matches before finalizing.
                  </span>
                )}
              </div>
              {awards.length > 0 && (
                <div style={{ overflowX: "auto", marginTop: "18px" }}>
                  <h3 style={{ fontSize: "14px" }}>Ranking-point awards</h3>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      textAlign: "left",
                      fontSize: "12px",
                    }}
                  >
                    <thead>
                      <tr style={{ color: "#64748b", backgroundColor: "#f8fafc" }}>
                        <th style={{ padding: "10px" }}>PLAYER / REGISTRATION</th>
                        <th style={{ padding: "10px" }}>AWARD</th>
                        <th style={{ padding: "10px" }}>CATEGORY</th>
                        <th style={{ padding: "10px" }}>POINTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {awards.map((award, index) => (
                        <tr
                          key={award.id ?? `${award.registrationId}-${index}`}
                          style={{ borderTop: "1px solid #e2e8f0" }}
                        >
                          <td style={{ padding: "11px 10px" }}>
                            {award.player?.name ||
                              award.registration?.name ||
                              award.name ||
                              (award.registrationId != null
                                ? `Registration #${award.registrationId}`
                                : "—")}
                          </td>
                          <td style={{ padding: "11px 10px" }}>
                            {award.label || award.position || award.awardName || "—"}
                          </td>
                          <td style={{ padding: "11px 10px" }}>
                            {award.categoryName || award.categoryCode || "—"}
                          </td>
                          <td style={{ padding: "11px 10px", fontWeight: 700 }}>
                            {award.points ?? award.pointsAwarded ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <p style={{ color: "#64748b", fontSize: "12px" }}>
            Live-match controls, scheduling, and court assignment are not
            available because the supplied API does not persist those actions.
          </p>
        </>
      )}

      {scoreMatch && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setScoreMatch(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            padding: "20px",
            display: "grid",
            placeItems: "center",
            backgroundColor: "rgba(15, 23, 42, 0.6)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="score-dialog-title"
            style={{
              width: "100%",
              maxWidth: "540px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              borderRadius: "12px",
              backgroundColor: "#ffffff",
              boxSizing: "border-box",
            }}
          >
            <h2
              id="score-dialog-title"
              style={{ margin: "0 0 6px", fontSize: "17px" }}
            >
              Enter match result
            </h2>
            <p style={{ margin: "0 0 18px", color: "#64748b", fontSize: "12px" }}>
              <strong>P1:</strong>{" "}
              {getParticipant(
                scoreMatch,
                1,
                registrationsById,
                registrationsByPosition,
              )}{" "}
              <span aria-hidden="true">vs</span>{" "}
              <strong>P2:</strong>{" "}
              {getParticipant(
                scoreMatch,
                2,
                registrationsById,
                registrationsByPosition,
              )}
            </p>
            <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: "12px" }}>
              Enter the official score: each badminton game is played to 21,
              must be won by 2, and is capped at 30.{" "}
              {selectedCategory?.matchFormat || "Best of 3 games"}.
            </p>
            {scoreGames.map((game, index) => (
              <div
                key={game.gameNumber}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "12px",
                }}
              >
                <label style={{ fontSize: "12px" }}>
                  Game {index + 1} · P1
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="1"
                    value={game.participant1Score}
                    onChange={(event) =>
                      setScoreGames((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, participant1Score: event.target.value }
                            : item,
                        ),
                      )
                    }
                    style={{ ...inputStyle, marginTop: "5px" }}
                  />
                </label>
                <span style={{ textAlign: "center", color: "#64748b" }}>vs</span>
                <label style={{ fontSize: "12px" }}>
                  Game {index + 1} · P2
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="1"
                    value={game.participant2Score}
                    onChange={(event) =>
                      setScoreGames((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, participant2Score: event.target.value }
                            : item,
                        ),
                      )
                    }
                    style={{ ...inputStyle, marginTop: "5px" }}
                  />
                </label>
              </div>
            ))}
            {scoreGames.length < maxScoreGames && (
              <button
                type="button"
                onClick={() =>
                  setScoreGames((current) => [
                    ...current,
                    {
                      gameNumber: current.length + 1,
                      participant1Score: "",
                      participant2Score: "",
                    },
                  ])
                }
                style={{
                  ...buttonStyle,
                  backgroundColor: "#f1f5f9",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                }}
              >
                Add game
              </button>
            )}
            {actionError && (
              <p role="alert" style={{ color: "#b91c1c", fontSize: "12px" }}>
                {actionError}
              </p>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              <button
                type="button"
                onClick={() => setScoreMatch(null)}
                disabled={busyAction === "score"}
                style={{
                  ...buttonStyle,
                  backgroundColor: "#f1f5f9",
                  color: "#334155",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMatchResult}
                disabled={busyAction === "score"}
                style={buttonStyle}
              >
                {busyAction === "score" ? "Saving…" : "Save result"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
