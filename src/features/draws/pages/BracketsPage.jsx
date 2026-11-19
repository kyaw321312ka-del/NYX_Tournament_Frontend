import React, { useState, useRef } from "react";
import {
  KeyboardArrowDownRounded,
  CalendarMonthRounded,
  ScheduleRounded,
  CheckCircleRounded,
  PlayCircleFilledRounded,
} from "@mui/icons-material";

// Mock Database with Category & Date mapping for dynamic filtering
const matchesDatabase = [
  {
    id: 1,
    category: "Men's Singles (MS)",
    date: "2026-12-06",
    upcoming: {
      player1: {
        name: "Min Thant",
        seed: "[1]",
        org: "Yangon Club • 4,850 PTS",
        avatar: "MT",
      },
      player2: {
        name: "Kyaw Swar",
        seed: "",
        org: "Mandalay Heroes • 3,750 PTS",
        avatar: "KS",
      },
      round: "Round of 16 • Court B",
      time: "02:30 PM",
      countdown: "⏳ In 2h 15m",
    },
    live: [
      {
        court: "COURT A",
        cat: "Men's Singles • Quarter-Final",
        status: "DECIDER SET 3",
        player1: { name: "#8 Aung Myo", org: "YGN", scores: [21, 18, 14] },
        player2: { name: "#2 Zarni Tun", org: "MDY", scores: [19, 21, 12] },
      },
    ],
    fixtures: [
      {
        court: "COURT C",
        round: "Men's Singles • Round of 16",
        time: "03:15 PM MMT • UP NEXT",
        p1: "#5 Htet Aung (SHAN)",
        p2: "#6 Zaw Lin (YGN)",
      },
      {
        court: "COURT A",
        round: "Men's Singles • Round of 16",
        time: "Sat, 04:00 PM • SCHEDULED",
        p1: "#7 Hein Htet (MDY)",
        p2: "Su Su (YGN)",
      },
    ],
    completed: [
      {
        court: "CRT 1",
        round: "Men's Singles • Round of 16",
        status: "✅ FINISHED • Official Result",
        p1: { name: "Min Thant", win: true, scores: [21, 21] },
        p2: { name: "Kyaw Swar", win: false, scores: [18, 15] },
      },
    ],
  },
  {
    id: 2,
    category: "Women's Singles (WS)",
    date: "2026-12-06",
    upcoming: null,
    live: [
      {
        court: "COURT B",
        cat: "Women's Singles • Semi-Final",
        status: "SET 2 IN-PLAY",
        player1: { name: "Hnin Thet", org: "YGN", scores: [21, 15] },
        player2: { name: "Khin Wint", org: "SHAN", scores: [19, 12] },
      },
    ],
    fixtures: [
      {
        court: "COURT B",
        round: "Women's Singles • Quarter-Final",
        time: "04:30 PM MMT • UP NEXT",
        p1: "May Zin (MDY)",
        p2: "Nilar Win (YGN)",
      },
    ],
    completed: [],
  },
  {
    id: 3,
    category: "Men's Doubles (MD)",
    date: "2026-12-06",
    upcoming: null,
    live: [],
    fixtures: [
      {
        court: "COURT D",
        round: "Men's Doubles • Round of 32",
        time: "02:00 PM MMT • UP NEXT",
        p1: "Min Thant & Zarni Tun",
        p2: "Aung Kyaw & Htet Aung",
      },
    ],
    completed: [],
  },
  {
    id: 4,
    category: "Mixed Doubles (XD)",
    date: "2026-12-06",
    upcoming: null,
    live: [],
    fixtures: [],
    completed: [],
  },
];

export default function BracketsSchedule() {
  const [selectedCategory, setSelectedCategory] =
    useState("Men's Singles (MS)");
  const [selectedDate, setSelectedDate] = useState("2026-12-06");
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const dateInputRef = useRef(null);

  const categories = [
    "Men's Singles (MS)",
    "Women's Singles (WS)",
    "Men's Doubles (MD)",
    "Mixed Doubles (XD)",
  ];

  const currentData = matchesDatabase.find(
    (item) => item.category === selectedCategory && item.date === selectedDate,
  ) || { upcoming: null, live: [], fixtures: [], completed: [] };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Top Filter Bar: Category Dropdown & Match Schedule Calendar Button */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #eef0f3",
          borderRadius: "16px",
          padding: "16px 20px",
          boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Category Dropdown */}
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <button
            onClick={() => setShowCatDropdown((v) => !v)}
            style={{
              width: "100%",
              minHeight: "46px",
              padding: "0 16px",
              border: "1px solid #cbd5e1",
              borderRadius: "12px",
              background: "#f8f9fa",
              color: "#172033",
              fontWeight: "800",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
          >
            <span>{selectedCategory}</span>
            <KeyboardArrowDownRounded />
          </button>

          {showCatDropdown && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                width: "100%",
                background: "#fff",
                border: "1px solid #eef0f3",
                borderRadius: "12px",
                boxShadow: "0 15px 35px rgba(20, 30, 50, 0.15)",
                zIndex: 20,
                padding: "8px",
              }}
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setShowCatDropdown(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "none",
                    borderRadius: "8px",
                    background:
                      selectedCategory === cat ? "#fde9ee" : "transparent",
                    color: selectedCategory === cat ? "#ae1236" : "#354052",
                    fontWeight: "800",
                    fontSize: "13px",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Match Schedule Button */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() =>
              dateInputRef.current?.showPicker?.() ||
              dateInputRef.current?.click()
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minHeight: "46px",
              padding: "0 18px",
              border: "none",
              borderRadius: "12px",
              background: "#172033",
              color: "#fff",
              fontWeight: "800",
              fontSize: "13.5px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(23, 32, 51, 0.2)",
              whiteSpace: "nowrap",
            }}
          >
            <CalendarMonthRounded style={{ fontSize: 18, color: "#ff3366" }} />
            <span>Match Schedule</span>
          </button>

          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              position: "absolute",
              opacity: 0,
              pointerEvents: "none",
              bottom: 0,
              left: 0,
            }}
          />
        </div>
      </div>

      {/* Your Upcoming Match Card */}
      {currentData.upcoming ? (
        <div
          style={{
            background: "linear-gradient(135deg, #fff5f7 0%, #fff 100%)",
            border: "1px solid #f8d7da",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 4px 16px rgba(174, 18, 54, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              flexWrap: "wrap",
              gap: "6px",
            }}
          >
            <span
              style={{
                fontSize: "11.5px",
                fontWeight: "900",
                color: "#ae1236",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <PlayCircleFilledRounded fontSize="small" /> YOUR UPCOMING MATCH •{" "}
              {currentData.upcoming.round}
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "800",
                color: "#b45309",
                background: "#fef3c7",
                padding: "3px 8px",
                borderRadius: "6px",
              }}
            >
              {currentData.upcoming.countdown}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#fff",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #f1f3f6",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontWeight: "900",
                fontSize: "14px",
                color: "#172033",
                flex: 1,
                minWidth: "130px",
              }}
            >
              <span
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "#faebd7",
                  color: "#b8860b",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "12px",
                  flexShrink: 0,
                }}
              >
                {currentData.upcoming.player1.avatar}
              </span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {currentData.upcoming.player1.name}{" "}
                  <span style={{ fontSize: "11px", color: "#727987" }}>
                    {currentData.upcoming.player1.seed}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#727987",
                    fontWeight: "700",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {currentData.upcoming.player1.org}
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: "12.5px",
                fontWeight: "900",
                color: "#727987",
                background: "#f1f3f6",
                padding: "6px 12px",
                borderRadius: "8px",
                flexShrink: 0,
              }}
            >
              {currentData.upcoming.time}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontWeight: "900",
                fontSize: "14px",
                color: "#172033",
                textAlign: "right",
                flex: 1,
                justifyContent: "flex-end",
                minWidth: "130px",
              }}
            >
              <div style={{ minWidth: 0, textAlign: "right" }}>
                <div
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {currentData.upcoming.player2.name}{" "}
                  <span style={{ fontSize: "11px", color: "#727987" }}>
                    {currentData.upcoming.player2.seed}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#727987",
                    fontWeight: "700",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {currentData.upcoming.player2.org}
                </div>
              </div>
              <span
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "#eef0f3",
                  color: "#354052",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "12px",
                  flexShrink: 0,
                }}
              >
                {currentData.upcoming.player2.avatar}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "#fff",
            border: "1px solid #eef0f3",
            borderRadius: "16px",
            padding: "18px",
            textAlign: "center",
            color: "#727987",
            fontSize: "13px",
            fontWeight: "700",
          }}
        >
          No upcoming personal matches enrolled for {selectedCategory} on{" "}
          {selectedDate}.
        </div>
      )}

      {/* Live Matches Now */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #eef0f3",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
          }}
        >
          <h4
            style={{
              fontSize: "16px",
              fontWeight: "900",
              color: "#172033",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                background: "#dc2626",
                display: "inline-block",
              }}
            />
            Live Matches Now{" "}
            <span
              style={{
                fontSize: "11.5px",
                color: "#727987",
                fontWeight: "700",
              }}
            >
              • Court In-Play
            </span>
          </h4>
          <span
            style={{
              fontSize: "11px",
              fontWeight: "900",
              color: "#dc2626",
              background: "#fde9ee",
              padding: "3px 8px",
              borderRadius: "6px",
            }}
          >
            {currentData.live.length} ACTIVE COURT
            {currentData.live.length > 1 ? "S" : ""}
          </span>
        </div>

        {currentData.live.length > 0 ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {currentData.live.map((match, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: "#172033",
                    color: "#fff",
                    padding: "8px 16px",
                    fontSize: "11.5px",
                    fontWeight: "900",
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "6px",
                  }}
                >
                  <span>
                    {match.court} • {match.cat}
                  </span>
                  <span style={{ color: "#fca5a5" }}>🔴 {match.status}</span>
                </div>
                <div
                  style={{
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontWeight: "900",
                      fontSize: "14px",
                      color: "#172033",
                    }}
                  >
                    <div
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginRight: "10px",
                      }}
                    >
                      {match.player1.name}{" "}
                      <span style={{ fontSize: "11px", color: "#727987" }}>
                        {match.player1.org}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        color: "#475569",
                        fontSize: "15px",
                        flexShrink: 0,
                      }}
                    >
                      {match.player1.scores.map((s, i) => (
                        <span
                          key={i}
                          style={{
                            color: i === 2 ? "#ae1236" : "inherit",
                            fontWeight: i === 2 ? "900" : "700",
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontWeight: "900",
                      fontSize: "14px",
                      color: "#172033",
                    }}
                  >
                    <div
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginRight: "10px",
                      }}
                    >
                      {match.player2.name}{" "}
                      <span style={{ fontSize: "11px", color: "#727987" }}>
                        {match.player2.org}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        color: "#475569",
                        fontSize: "15px",
                        flexShrink: 0,
                      }}
                    >
                      {match.player2.scores.map((s, i) => (
                        <span
                          key={i}
                          style={{
                            color: i === 2 ? "#172033" : "inherit",
                            fontWeight: i === 2 ? "900" : "700",
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "18px",
              textAlign: "center",
              background: "#f8f9fa",
              borderRadius: "10px",
              color: "#727987",
              fontSize: "13px",
              fontWeight: "700",
            }}
          >
            No live matches currently in-play for {selectedCategory} on this
            date.
          </div>
        )}
      </div>

      {/* Order of Play & Fixtures */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #eef0f3",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
          }}
        >
          <h4
            style={{
              fontSize: "16px",
              fontWeight: "900",
              color: "#172033",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ScheduleRounded style={{ fontSize: 18, color: "#ae1236" }} /> Order
            of Play & Fixtures ({selectedDate})
          </h4>
          <span
            style={{ fontSize: "11.5px", fontWeight: "800", color: "#727987" }}
          >
            {currentData.fixtures.length} Scheduled
          </span>
        </div>

        {currentData.fixtures.length > 0 ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {currentData.fixtures.map((fix, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid #eef0f3",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  background: "#f8f9fa",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "11.5px",
                    fontWeight: "800",
                    color: "#727987",
                    marginBottom: "6px",
                    flexWrap: "wrap",
                    gap: "4px",
                  }}
                >
                  <span>
                    {fix.court} • {fix.round}
                  </span>
                  <span
                    style={{
                      color: fix.time.includes("UP NEXT")
                        ? "#087b59"
                        : "inherit",
                    }}
                  >
                    {fix.time}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    fontSize: "14px",
                    fontWeight: "900",
                    color: "#172033",
                  }}
                >
                  <div>{fix.p1}</div>
                  <div>{fix.p2}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "18px",
              textAlign: "center",
              background: "#f8f9fa",
              borderRadius: "10px",
              color: "#727987",
              fontSize: "13px",
              fontWeight: "700",
            }}
          >
            No scheduled fixtures found for {selectedCategory} on {selectedDate}
            .
          </div>
        )}
      </div>

      {/* Completed Matches */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #eef0f3",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "0 4px 16px rgba(20, 30, 50, 0.03)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
          }}
        >
          <h4
            style={{
              fontSize: "16px",
              fontWeight: "900",
              color: "#172033",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <CheckCircleRounded style={{ fontSize: 18, color: "#087b59" }} />{" "}
            Completed Matches
          </h4>
          <span
            style={{ fontSize: "11.5px", fontWeight: "800", color: "#727987" }}
          >
            Official Scored
          </span>
        </div>

        {currentData.completed.length > 0 ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {currentData.completed.map((comp, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid #eef0f3",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "11.5px",
                    fontWeight: "800",
                    color: "#727987",
                    marginBottom: "6px",
                    flexWrap: "wrap",
                    gap: "4px",
                  }}
                >
                  <span>
                    {comp.court} • {comp.round}
                  </span>
                  <span style={{ color: "#596170" }}>{comp.status}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "14px",
                    fontWeight: "900",
                    color: "#172033",
                    marginBottom: "6px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span>{comp.p1.name}</span>
                    {comp.p1.win && (
                      <span
                        style={{
                          background: "#e4f7ef",
                          color: "#087b59",
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: "900",
                        }}
                      >
                        WINNER
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
                    {comp.p1.scores.map((sc, i) => (
                      <span key={i}>{sc}</span>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "14px",
                    fontWeight: "800",
                    color: "#727987",
                  }}
                >
                  <div>{comp.p2.name}</div>
                  <div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
                    {comp.p2.scores.map((sc, i) => (
                      <span key={i}>{sc}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "18px",
              textAlign: "center",
              background: "#f8f9fa",
              borderRadius: "10px",
              color: "#727987",
              fontSize: "13px",
              fontWeight: "700",
            }}
          >
            No completed matches found for {selectedCategory} on this date.
          </div>
        )}
      </div>
    </div>
  );
}
