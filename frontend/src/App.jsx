import { useEffect, useState } from "react";
import "./App.css";
import io from "socket.io-client";
import Editor from "@monaco-editor/react";
import { v4 as uuid } from "uuid";
import { Toaster, toast } from 'react-hot-toast';

const socket = io("https://codeconnect-by-team-seven.onrender.com");

// Toast configuration
const toastConfig = {
  position: 'top-center',
  duration: 3000,
  style: {
    background: 'rgba(30, 30, 45, 0.95)',
    color: '#fff',
    border: '1px solid rgba(123, 47, 255, 0.2)',
    boxShadow: '0 4px 12px rgba(123, 47, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    marginTop: '20px',
  },
  className: 'toast-message',
  iconTheme: {
    primary: '#7B2FFF',
    secondary: '#fff',
  },
};

// Mapping Piston API language values to Monaco Editor language identifiers
const getMonacoLanguage = (language) => {
  const languageMap = {
    javascript: "javascript",
    python: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
    csharp: "csharp",
    go: "go",
    ruby: "ruby",
    rust: "rust",
    php: "php",
    swift: "swift",
    kotlin: "kotlin",
    typescript: "typescript",
    scala: "scala",
    r: "r",
    perl: "perl",
    haskell: "haskell",
    lua: "lua",
    dart: "dart",
    elixir: "elixir",
    bash: "shell",
    sql: "sql",
  };

  return languageMap[language] || "plaintext";
};

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [outPut, setOutPut] = useState("");
  const [version, setVersion] = useState("*");
  const [showVersionSelect, setShowVersionSelect] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [theme, setTheme] = useState("vs-dark");
  const [languageVersions, setLanguageVersions] = useState({
    javascript: ["ES6", "Node.js 20", "Node.js 18", "Node.js 16"],
    python: ["3.10", "3.9", "3.8", "3.7"],
    java: ["21", "17", "11", "8"],
    cpp: ["C++20", "C++17", "C++14", "C++11"],
    c: ["C23", "C17", "C11", "C99", "C89"],
    csharp: ["10.0", "9.0", "8.0", "7.0"],
    go: ["1.21", "1.20", "1.19", "1.18"],
    ruby: ["3.2", "3.1", "3.0", "2.7"],
    rust: ["1.75", "1.70", "1.65", "1.60"],
    php: ["8.2", "8.1", "8.0", "7.4"],
    kotlin: ["1.9", "1.8", "1.7", "1.6"],
  });
  const [isRunning, setIsRunning] = useState(false);
  const [username, setUsername] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [isUsersSidebarOpen, setIsUsersSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    socket.on("userJoined", (users) => {
      setUsers(users);
      // Notify when a new user joins (except for the current user)
      const newUser = users.find(user => user !== userName);
      if (newUser) {
        toast.success(`${newUser} joined the room`, toastConfig);
      }
    });

    socket.on("codeUpdate", (newCode) => {
      setCode(newCode);
    });

    socket.on("userTyping", (user) => {
      setTyping(`${user.slice(0, 8)}... is Typing`);
      setTimeout(() => setTyping(""), 2000);
    });

    socket.on("languageUpdate", (newLanguage) => {
      setLanguage(newLanguage);
    });

    socket.on("codeResponse", (response) => {
      if (response.error) {
        setOutPut(response.error);
        toast.error(response.error, toastConfig);
      } else {
        setOutPut(response.run.output || "No output");
        toast.success("Code executed successfully!", toastConfig);
      }
      setIsRunning(false);
    });

    socket.on("compileError", (error) => {
      setOutPut(`Error: ${error.message || "Something went wrong"}`);
      toast.error(`Error: ${error.message || "Something went wrong"}`, toastConfig);
      setIsRunning(false);
    });

    socket.on("disconnect", () => {
      setOutPut("Lost connection to server. Please refresh the page.");
      toast.error("Lost connection to server. Please refresh the page.", toastConfig);
      setIsRunning(false);
    });

    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
      socket.off("codeResponse");
      socket.off("compileError");
      socket.off("disconnect");
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      socket.emit("leaveRoom");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const joinRoom = () => {
    if (roomId && userName) {
      socket.emit("join", { roomId, userName });
      setJoined(true);
      toast.success(`Welcome to the room, ${userName}!`, {
        ...toastConfig,
        duration: 4000,
      });
    } else {
      toast.error("Please enter both Room ID and User Name", toastConfig);
    }
  };

  const leaveRoom = () => {
    if (window.confirm("Are you sure you want to leave the room?")) {
      socket.emit("leaveRoom");
      setJoined(false);
      setRoomId("");
      setUserName("");
      setCode("");
      setLanguage("javascript");
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast.success("Room ID copied to clipboard!", toastConfig);
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
    socket.emit("typing", { roomId, userName });
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socket.emit("languageChange", { roomId, language: newLanguage });
    toast.success(`Language changed to ${newLanguage}`, toastConfig);
  };

  const handleThemeChange = (e) => {
    const newTheme = e.target.value;
    setTheme(newTheme);
    toast.success(`Theme changed to ${newTheme}`, toastConfig);
  };

  const [userInput, setUserInput] = useState("");

  const runCode = () => {
    if (!code.trim()) {
      toast.error("Please write some code before running", toastConfig);
      return;
    }

    try {
      setIsRunning(true);
      setOutPut(""); // Clear previous output
      socket.emit("compileCode", {
        code,
        roomId,
        language,
        version,
        input: userInput,
      });
    } catch (error) {
      toast.error(
        `Error: ${error.message || "Failed to send code for execution"}`,
        toastConfig
      );
      setIsRunning(false);
    }
  };

  const createRoomId = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let roomId = "";
    for (let i = 0; i < 10; i++) {
      roomId += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    setRoomId(roomId);
  };

  const Navbar = ({ isVisible }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
      setIsMenuOpen(!isMenuOpen);
    };

    return (
      <nav className={`navbar ${!isVisible ? "hidden" : ""}`}>
        <a href="/" className="navbar-brand">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7B2FFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3L3 8L8 13" />
            <path d="M16 3L21 8L16 13" />
          </svg>
          <h1>CodeConnect</h1>
        </a>
        <div
          className={`hamburger ${isMenuOpen ? "active" : ""}`}
          onClick={toggleMenu}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className={`navbar-links ${isMenuOpen ? "active" : ""}`}>
          <a href="/about" className="navbar-link">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            About
          </a>
          <a
            href="https://pabitra-sahoo.github.io/Code-Connect-Team/"
            className="navbar-link"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Developers
          </a>
        </div>
      </nav>
    );
  };

  const Footer = ({ isVisible }) => (
    <footer className={`footer ${!isVisible ? "hidden" : ""}`}>
      <span>Made with</span>
      <span className="heart">❤️</span>
      <span>by</span>
      <a href="https://pabitra-sahoo.github.io/Code-Connect-Team/">
        Team Seven
      </a>
      <span>•</span>
      <a href="/">CodeConnect</a>
      <span>© 2025</span>
    </footer>
  );

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    if (!isMobileMenuOpen) {
      setIsUsersSidebarOpen(false);
    }
  };

  const toggleUsersSidebar = () => {
    setIsUsersSidebarOpen(!isUsersSidebarOpen);
    if (!isUsersSidebarOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  if (!joined) {
    return (
      <>
        <Navbar isVisible={!joined} />
        <div className="join-container">
          <div className="floating-files">
            {[...Array(50)].map((_, i) => (
              <div
                key={`star-${i}`}
                className="star"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
              />
            ))}
            {[...Array(15)].map((_, i) => (
              <div
                key={`file-${i}`}
                className="floating-file"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${8 + Math.random() * 4}s`,
                  animationDelay: `${Math.random() * 2}s`,
                  transform: `scale(${0.8 + Math.random() * 0.4})`,
                }}
              >
                <svg
                  width="40"
                  height="50"
                  viewBox="0 0 40 50"
                  fill="none"
                  stroke="rgba(123, 47, 255, 0.3)"
                >
                  <rect
                    x="4"
                    y="4"
                    width="32"
                    height="42"
                    rx="2"
                    strokeWidth="2"
                  />
                  <path d="M10 12H30" strokeWidth="2" />
                  <path d="M10 18H30" strokeWidth="2" />
                  <path d="M10 24H20" strokeWidth="2" />
                </svg>
              </div>
            ))}
          </div>
          <div className="join-form">
            <div className="logo">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7B2FFF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 3L3 8L8 13" />
                <path d="M16 3L21 8L16 13" />
              </svg>
              <h1>Code-Room</h1>
            </div>
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Enter Room Id"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && roomId && userName) {
                    joinRoom();
                  }
                }}
              />
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M9 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM9 6v0"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 9h9l1.5 2L21 13h-2l-1 2h-2l-1-2h-3"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Enter Your Name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && roomId && userName) {
                    joinRoom();
                  }
                }}
              />
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
                />
              </svg>
            </div>
            <button onClick={joinRoom}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13 12H3"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Join Session
            </button>
            <div onClick={createRoomId} className="generate-id">
              <span>don't have a room id?</span>
              <span className="sparkle">✨</span>
              <span style={{ color: "#b57bff" }}>Generate ID</span>
            </div>
          </div>
        </div>
        <Footer isVisible={!joined} />
      </>
    );
  }

  return (
    <div className="editor-container">
      <Toaster {...toastConfig} />
      <div className="editor-header">
        <div className="logo" onClick={() => {
          setWordWrap(!wordWrap);
          toast.success(`Word wrap ${!wordWrap ? 'enabled' : 'disabled'}`, toastConfig);
        }} style={{ cursor: 'pointer' }}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7B2FFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3L3 8L8 13" />
            <path d="M16 3L21 8L16 13" />
          </svg>
          <h1>CodeConnect</h1>
        </div>
        <div className="header-right">
          <button
            className={`run-button ${
              isRunning ? "loading" : ""
            } mobile-run-button`}
            onClick={runCode}
            disabled={isRunning}
          >
            {isRunning ? (
              <div className="loading-spinner"></div>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M5 3l14 9-14 9V3z"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <button
            className={`hamburger-menu ${isMobileMenuOpen ? "active" : ""}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div className={`editor-actions ${isMobileMenuOpen ? "show" : ""}`}>
            <button
              className="copy-button"
              onClick={copyRoomId}
              data-tooltip={roomId}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Copy Room Id
            </button>
            <button className="users-button" onClick={toggleUsersSidebar}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Users
              <span className="count">{users.length}</span>
            </button>
            <select
              className="language-selector"
              value={language}
              onChange={handleLanguageChange}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
              <option value="csharp">C#</option>
              <option value="go">Go</option>
              <option value="ruby">Ruby</option>
              <option value="rust">Rust</option>
              <option value="php">PHP</option>
              <option value="swift">Swift</option>
              <option value="kotlin">Kotlin</option>
              <option value="typescript">TypeScript</option>
              <option value="scala">Scala</option>
              <option value="r">R</option>
              <option value="perl">Perl</option>
              <option value="haskell">Haskell</option>
              <option value="lua">Lua</option>
              <option value="dart">Dart</option>
              <option value="elixir">Elixir</option>
              <option value="bash">Bash</option>
              <option value="sql">SQL</option>
            </select>
            {languageVersions[language] && (
              <select
                className="version-selector"
                value={version}
                onChange={(e) => {
                  setVersion(e.target.value);
                  socket.emit("languageChange", {
                    roomId,
                    language,
                    version: e.target.value,
                  });
                }}
              >
                <option value="*">Latest</option>
                {languageVersions[language].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            )}
            <select
              className="language-selector"
              value={theme}
              onChange={handleThemeChange}
            >
              <option value="vs-dark">Dark</option>
              <option value="vs-light">Light</option>
              <option value="hc-black">High Contrast</option>
            </select>
            <button
              className="run-button"
              onClick={runCode}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <div className="loading-spinner"></div>
                  <span>Running</span>
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M5 3l14 9-14 9V3z"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Run Code</span>
                </>
              )}
            </button>
            <button className="leave-button" onClick={leaveRoom}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 17l5-5-5-5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21 12H9"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Leave Room
            </button>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div
            className={`mobile-backdrop ${isMobileMenuOpen ? "show" : ""}`}
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </div>

      <div className={`users-sidebar ${isUsersSidebarOpen ? "open" : ""}`}>
        <div className="users-sidebar-header">
          <h3>Users in Room</h3>
          <button
            className="close-sidebar"
            onClick={() => setIsUsersSidebarOpen(false)}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <ul>
          {users.map((user, index) => (
            <li key={index}>
              <div className="user-avatar">{user.charAt(0).toUpperCase()}</div>
              {user.length > 20 ? `${user.slice(0, 20)}...` : user}
            </li>
          ))}
        </ul>
      </div>

      <div className="editor-main">
        <Editor
          height="60vh"
          defaultLanguage={getMonacoLanguage(language)}
          language={getMonacoLanguage(language)}
          value={code}
          onChange={handleCodeChange}
          theme={theme}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: wordWrap ? 'on' : 'off'
          }}
        />
        <div className="terminal-section">
          <div className="console-container">
            <div className="console-header">
              <div className="left">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
                <span>Input Console</span>
                <div
                  className="info-icon"
                  data-tooltip="Input Guide&#13;&#13;1️⃣ Single Line Input&#13;• Simply type your value&#13;• Example: 42&#13;&#13;2️⃣ Multiple Values (Same Line)&#13;• Separate with spaces&#13;• Example: 5 10 15&#13;&#13;3️⃣ Multiple Lines&#13;• Press Enter after each value&#13;• Example:&#13;  5&#13;  10&#13;  15"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </div>
                {typing && <div className="typing-status">{typing}</div>}
              </div>
              <button
                className="clear-console"
                onClick={() => {
                  setUserInput("");
                  toast.success("Input console cleared", toastConfig);
                }}
                title="Clear input"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                </svg>
              </button>
            </div>
            <textarea
              className="input-console"
              placeholder="Enter your input here..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
            />
          </div>
          <div className="console-container">
            <div className="console-header">
              <div className="left">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19l7-7-7-7M5 19l7-7-7-7" />
                </svg>
                <span>Output Console</span>
              </div>
              <button
                className="clear-console"
                onClick={() => {
                  setOutPut("");
                  toast.success("Output console cleared", toastConfig);
                }}
                title="Clear output"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                </svg>
              </button>
            </div>
            <textarea
              className="output-console"
              placeholder="Output will appear here..."
              value={outPut}
              readOnly
            />
          </div>
        </div>
      </div>

      {copySuccess && <div className="copy-success">{copySuccess}</div>}
    </div>
  );
};

export default App;
