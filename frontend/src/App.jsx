import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://127.0.0.1:5000/api";

function App() {
  // =====================================================
  // AUTH
  // =====================================================

  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const emptyRegister = {
    name: "",
    roll_no: "",
    username: "",
    password: "",
    confirm_password: "",
    skills: "",
    interests: "",
  };

  const [registerForm, setRegisterForm] = useState(emptyRegister);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  // =====================================================
  // COMMON DATA
  // =====================================================

  const [page, setPage] = useState("Dashboard");
  const [students, setStudents] = useState([]);
  const [skills, setSkills] = useState([]);
  const [stats, setStats] = useState(null);
  const [classes, setClasses] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);

  // =====================================================
  // PROFESSOR FORMS
  // =====================================================

  const emptyStudent = {
    name: "",
    roll_no: "",
    skills: "",
    interests: "",
  };

  const emptyClass = {
    topic: "",
    class_date: "",
    class_time: "",
    description: "",
  };

  const [studentForm, setStudentForm] = useState(emptyStudent);
  const [classForm, setClassForm] = useState(emptyClass);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");

  // =====================================================
  // STUDENT STATE
  // =====================================================

  const [studentProfile, setStudentProfile] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    skills: "",
    interests: "",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skillLevel, setSkillLevel] = useState("Beginner");
  const [notificationList, setNotificationList] = useState([]);

  // =====================================================
  // CHAT STATE
  // =====================================================

  const [chatUsers, setChatUsers] = useState([]);
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  // =====================================================
  // COMMON DATA LOAD
  // =====================================================

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        studentsRes,
        skillsRes,
        statsRes,
        classesRes,
        recommendationRes,
      ] = await Promise.all([
        axios.get(`${API}/students`),
        axios.get(`${API}/skills`),
        axios.get(`${API}/stats`),
        axios.get(`${API}/classes`),
        axios.get(`${API}/recommendation`),
      ]);

      setStudents(studentsRes.data || []);
      setSkills(skillsRes.data || []);
      setStats(statsRes.data || null);
      setClasses(classesRes.data || []);
      setRecommendation(recommendationRes.data || null);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // STUDENT DATA LOAD
  // =====================================================

  const loadStudentData = async (loggedUser = user) => {
    try {
      setStudentLoading(true);

      const [studentsRes, classesRes, skillsRes] = await Promise.all([
        axios.get(`${API}/students`),
        axios.get(`${API}/classes`),
        axios.get(`${API}/skills`),
      ]);

      const allStudents = studentsRes.data || [];
      const currentId = loggedUser?.student_id || loggedUser?.student?.id;
      const currentRoll = loggedUser?.student?.roll_no;

      const currentStudent =
        allStudents.find((s) => String(s.id) === String(currentId)) ||
        allStudents.find((s) => s.roll_no === currentRoll) ||
        loggedUser?.student ||
        null;

      if (currentStudent) {
        setStudentProfile(currentStudent);
        setProfileForm({
          name: currentStudent.name || "",
          skills: currentStudent.skills || "",
          interests: currentStudent.interests || "",
        });
      }

      setClasses(classesRes.data || []);
      setSkills(skillsRes.data || []);

      const classNotifications = (classesRes.data || []).slice(0, 5).map((item) => ({
        id: `class-${item.id}`,
        icon: "📚",
        title: "New Special Class",
        text: `${item.topic} has been scheduled.`,
      }));

      setNotificationList(classNotifications);
    } catch (error) {
      console.error("Error loading student data:", error);
    } finally {
      setStudentLoading(false);
    }
  };

  useEffect(() => {
    if (loggedIn && user?.role === "professor") {
      loadData();
    }

    if (loggedIn && user?.role === "student") {
      loadStudentData(user);
    }
  }, [loggedIn, user]);

  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");

    if (!username.trim() || !password.trim()) {
      setLoginError("Please enter username and password.");
      return;
    }

    try {
      setLoginLoading(true);

      const response = await axios.post(`${API}/login`, {
        username: username.trim(),
        password: password.trim(),
      });

      if (response.data.user) {
        const loggedUser = response.data.user;

        setUser(loggedUser);
        setLoggedIn(true);
        setPage("Dashboard");
        setUsername("");
        setPassword("");
      }
    } catch (error) {
      setLoginError(
        error.response?.data?.message ||
          "Unable to login. Please try again."
      );
    } finally {
      setLoginLoading(false);
    }
  };

  // =====================================================
  // REGISTER
  // =====================================================

  const handleRegisterChange = (e) => {
    setRegisterForm({
      ...registerForm,
      [e.target.name]: e.target.value,
    });
    setRegisterError("");
    setRegisterSuccess("");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError("");
    setRegisterSuccess("");

    const {
      name,
      roll_no,
      username: registerUsername,
      password: registerPassword,
      confirm_password,
      skills: registerSkills,
      interests,
    } = registerForm;

    if (
      !name.trim() ||
      !roll_no.trim() ||
      !registerUsername.trim() ||
      !registerPassword.trim() ||
      !confirm_password.trim()
    ) {
      setRegisterError("Please fill all required fields.");
      return;
    }

    if (registerPassword !== confirm_password) {
      setRegisterError("Passwords do not match.");
      return;
    }

    if (registerPassword.length < 6) {
      setRegisterError("Password must contain at least 6 characters.");
      return;
    }

    try {
      setRegisterLoading(true);

      const response = await axios.post(`${API}/register`, {
        name: name.trim(),
        roll_no: roll_no.trim(),
        username: registerUsername.trim(),
        password: registerPassword,
        confirm_password,
        skills: registerSkills.trim(),
        interests: interests.trim(),
      });

      if (response.data.user) {
        setRegisterSuccess(
          "Account created successfully! You can now sign in."
        );
        setRegisterForm(emptyRegister);

        setTimeout(() => {
          setAuthMode("login");
          setUsername(registerUsername);
          setPassword("");
          setRegisterSuccess("");
        }, 1200);
      }
    } catch (error) {
      setRegisterError(
        error.response?.data?.message ||
          "Unable to create account. Please try again."
      );
    } finally {
      setRegisterLoading(false);
    }
  };

  const showRegister = () => {
    setAuthMode("register");
    setLoginError("");
    setRegisterError("");
    setRegisterSuccess("");
    setUsername("");
    setPassword("");
  };

  const showLogin = () => {
    setAuthMode("login");
    setLoginError("");
    setRegisterError("");
    setRegisterSuccess("");
    setRegisterForm(emptyRegister);
    setUsername("");
    setPassword("");
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    setLoggedIn(false);
    setUser(null);
    setStudentProfile(null);
    setUsername("");
    setPassword("");
    setAuthMode("login");
    setPage("Dashboard");
  };

  // =====================================================
  // PROFESSOR - DEMO DATA
  // =====================================================

  const loadDemoData = async () => {
    try {
      await axios.post(`${API}/demo`);
      await loadData();
      alert("Demo students added successfully.");
    } catch {
      alert("Unable to load demo data.");
    }
  };

  // =====================================================
  // PROFESSOR - STUDENT CRUD
  // =====================================================

  const handleStudentChange = (e) => {
    setStudentForm({
      ...studentForm,
      [e.target.name]: e.target.value,
    });
  };

  const saveStudent = async (e) => {
    e.preventDefault();

    if (!studentForm.name.trim() || !studentForm.roll_no.trim()) {
      alert("Name and Roll Number are required.");
      return;
    }

    try {
      if (editingStudent) {
        await axios.put(
          `${API}/students/${editingStudent.id}`,
          studentForm
        );
        alert("Student updated successfully.");
      } else {
        const response = await axios.post(`${API}/students`, studentForm);
        alert(
          `Student added successfully.\n\nLogin Username: ${response.data.login?.username || studentForm.roll_no}\nLogin Password: ${response.data.login?.password || studentForm.roll_no}`
        );
      }

      setStudentForm(emptyStudent);
      setEditingStudent(null);
      await loadData();
      setPage("Students");
    } catch (error) {
      alert(
        error.response?.data?.message || "Unable to save student."
      );
    }
  };

  const editStudent = (student) => {
    setStudentForm({
      name: student.name || "",
      roll_no: student.roll_no || "",
      skills: student.skills || "",
      interests: student.interests || "",
    });

    setEditingStudent(student);
    setPage("Add Student");
  };

  const deleteStudent = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student?")) {
      return;
    }

    try {
      await axios.delete(`${API}/students/${id}`);
      await loadData();
    } catch {
      alert("Unable to delete student.");
    }
  };

  // =====================================================
  // PROFESSOR - CLASS CRUD
  // =====================================================

  const handleClassChange = (e) => {
    setClassForm({
      ...classForm,
      [e.target.name]: e.target.value,
    });
  };

  const createClass = async (e) => {
    e.preventDefault();

    if (
      !classForm.topic.trim() ||
      !classForm.class_date ||
      !classForm.class_time
    ) {
      alert("Topic, date and time are required.");
      return;
    }

    try {
      await axios.post(`${API}/classes`, classForm);
      alert("Special class created successfully.");
      setClassForm(emptyClass);
      await loadData();
      setPage("Special Classes");
    } catch (error) {
      alert(
        error.response?.data?.message || "Unable to create class."
      );
    }
  };

  const deleteClass = async (id) => {
    if (!window.confirm("Delete this special class?")) return;

    try {
      await axios.delete(`${API}/classes/${id}`);
      await loadData();
    } catch {
      alert("Unable to delete class.");
    }
  };

  const createRecommendedClass = () => {
    if (!recommendation?.recommended) return;

    setClassForm({
      topic: recommendation.suggested_topic || recommendation.skill || "",
      class_date: "",
      class_time: "",
      description: `Special class recommended based on ${recommendation.count} student skill demand.`,
    });

    setPage("Create Special Class");
  };

  const filteredStudents = useMemo(() => {
    const query = studentSearch.toLowerCase();

    return students.filter((student) =>
      [
        student.name,
        student.roll_no,
        student.skills,
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      )
    );
  }, [students, studentSearch]);

  // =====================================================
  // STUDENT - PROFILE
  // =====================================================

  const handleProfileChange = (e) => {
    setProfileForm({
      ...profileForm,
      [e.target.name]: e.target.value,
    });
    setProfileMessage("");
  };

  const saveStudentProfile = async (e) => {
    e.preventDefault();

    if (!studentProfile?.id) {
      setProfileMessage("Student profile could not be found.");
      return;
    }

    try {
      setStudentLoading(true);

      const response = await axios.put(
        `${API}/students/${studentProfile.id}`,
        {
          name: profileForm.name.trim(),
          roll_no: studentProfile.roll_no,
          skills: profileForm.skills.trim(),
          interests: profileForm.interests.trim(),
        }
      );

      const updatedStudent =
        response.data.student || {
          ...studentProfile,
          ...profileForm,
        };

      setStudentProfile(updatedStudent);
      setUser((previous) => ({
        ...previous,
        student: {
          ...(previous?.student || {}),
          ...updatedStudent,
        },
      }));

      setProfileMessage("Profile updated successfully.");
      await loadStudentData({
        ...user,
        student: updatedStudent,
        student_id: updatedStudent.id,
      });
    } catch (error) {
      setProfileMessage(
        error.response?.data?.message ||
          "Unable to update profile."
      );
    } finally {
      setStudentLoading(false);
    }
  };

  // =====================================================
  // STUDENT - SKILLS
  // =====================================================

  const addStudentSkill = async (e) => {
    e.preventDefault();

    const newSkill = skillInput.trim();

    if (!newSkill) {
      setProfileMessage("Enter a skill first.");
      return;
    }

    if (!studentProfile?.id) {
      setProfileMessage("Student profile could not be found.");
      return;
    }

    const currentSkills = (studentProfile.skills || "")
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    const alreadyExists = currentSkills.some(
      (skill) => skill.toLowerCase() === newSkill.toLowerCase()
    );

    if (alreadyExists) {
      setProfileMessage("This skill is already in your profile.");
      return;
    }

    const updatedSkills = [...currentSkills, newSkill].join(", ");

    try {
      setStudentLoading(true);

      await axios.put(`${API}/students/${studentProfile.id}`, {
        name: studentProfile.name,
        roll_no: studentProfile.roll_no,
        skills: updatedSkills,
        interests: studentProfile.interests || "",
      });

      const updatedStudent = {
        ...studentProfile,
        skills: updatedSkills,
      };

      setStudentProfile(updatedStudent);
      setUser((previous) => ({
        ...previous,
        student: {
          ...(previous?.student || {}),
          ...updatedStudent,
        },
      }));

      setProfileForm((previous) => ({
        ...previous,
        skills: updatedSkills,
      }));

      setSkillInput("");
      setSkillLevel("Beginner");
      setProfileMessage(
        `${newSkill} added successfully as ${skillLevel}.`
      );

      await loadStudentData({
        ...user,
        student: updatedStudent,
        student_id: updatedStudent.id,
      });
    } catch (error) {
      setProfileMessage(
        error.response?.data?.message ||
          "Unable to add skill."
      );
    } finally {
      setStudentLoading(false);
    }
  };

  const removeStudentSkill = async (skillToRemove) => {
    if (!studentProfile?.id) return;

    const updatedSkills = (studentProfile.skills || "")
      .split(",")
      .map((skill) => skill.trim())
      .filter(
        (skill) =>
          skill &&
          skill.toLowerCase() !== skillToRemove.toLowerCase()
      )
      .join(", ");

    try {
      setStudentLoading(true);

      await axios.put(`${API}/students/${studentProfile.id}`, {
        name: studentProfile.name,
        roll_no: studentProfile.roll_no,
        skills: updatedSkills,
        interests: studentProfile.interests || "",
      });

      const updatedStudent = {
        ...studentProfile,
        skills: updatedSkills,
      };

      setStudentProfile(updatedStudent);
      setUser((previous) => ({
        ...previous,
        student: {
          ...(previous?.student || {}),
          ...updatedStudent,
        },
      }));

      setProfileForm((previous) => ({
        ...previous,
        skills: updatedSkills,
      }));

      setProfileMessage(`${skillToRemove} removed from your skills.`);
    } catch (error) {
      setProfileMessage(
        error.response?.data?.message ||
          "Unable to remove skill."
      );
    } finally {
      setStudentLoading(false);
    }
  };

  // =====================================================
  // CHAT
  // =====================================================

  const loadChatUsers = async (loggedUser = user) => {
    if (!loggedUser?.id) return;

    try {
      const response = await axios.get(`${API}/chat/users`, {
        params: { user_id: loggedUser.id },
      });

      const list = Array.isArray(response.data)
        ? response.data
        : response.data?.users || response.data?.data || [];
      setChatUsers(list);
      setChatUnreadCount(
        list.reduce((total, item) => total + (item.unread_count || 0), 0)
      );

      if (!activeChatUser && list.length > 0) {
        setActiveChatUser(list[0]);
      }
    } catch (error) {
      console.error("Error loading chat users:", error);
    }
  };

  const loadChatMessages = async (otherUser = activeChatUser) => {
    if (!user?.id || !otherUser?.id) return;

    try {
      setChatLoading(true);

      const response = await axios.get(
        `${API}/chat/${otherUser.id}`,
        { params: { user_id: user.id } }
      );

      const messages = Array.isArray(response.data)
        ? response.data
        : response.data?.messages || response.data?.data || [];

      setChatMessages(messages);

      await loadChatUsers(user);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setChatLoading(false);
    }
  };

  const sendChatMessage = async (e) => {
    e?.preventDefault();

    const message = chatInput.trim();

    if (!message || !user?.id || !activeChatUser?.id) return;

    try {
      setChatLoading(true);

      const response = await axios.post(`${API}/chat/send`, {
        sender_user_id: user.id,
        receiver_user_id: activeChatUser.id,
        message,
      });

      if (response.data?.data) {
        setChatMessages((previous) => [
          ...previous,
          response.data.data,
        ]);
      }

      setChatInput("");
      await loadChatUsers(user);
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Unable to send message."
      );
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (loggedIn && user?.id) {
      loadChatUsers(user);
    }
  }, [loggedIn, user]);

  useEffect(() => {
    if (!loggedIn || !user?.id || !activeChatUser?.id) return;

    // Load immediately when a conversation is opened.
    loadChatMessages(activeChatUser);

    // Refresh the open conversation so a message sent by the other
    // person appears automatically without a page refresh.
    const interval = setInterval(() => {
      loadChatMessages(activeChatUser);
    }, 2000);

    return () => clearInterval(interval);
  }, [loggedIn, user?.id, activeChatUser?.id]);

  const openChat = (chatUser) => {
    setActiveChatUser(chatUser);
    setPage("Messages");
  };

  const formatChatTime = (value) => {
    if (!value) return "";

    const date = new Date(value.replace(" ", "T") + "Z");

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    });
  };

  const renderChatPage = (isProfessor) => {
    const selected = activeChatUser;

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px minmax(0, 1fr)",
          minHeight: "620px",
          background: "#fff",
          border: "1px solid #e5e9f2",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 8px 30px rgba(20, 30, 60, 0.06)",
        }}
      >
        <div
          style={{
            borderRight: "1px solid #e5e9f2",
            background: "#f8faff",
          }}
        >
          <div
            style={{
              padding: "20px",
              borderBottom: "1px solid #e5e9f2",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "18px" }}>Messages</h2>
            <p style={{ margin: "6px 0 0", color: "#718096", fontSize: "13px" }}>
              {isProfessor
                ? "Talk to your students"
                : "Chat with your professor"}
            </p>
          </div>

          <div style={{ padding: "10px" }}>
            {chatUsers.length === 0 ? (
              <div style={{ padding: "24px 12px", color: "#718096", fontSize: "13px" }}>
                {isProfessor
                  ? "No student accounts available yet."
                  : "Professor account is not available."}
              </div>
            ) : (
              chatUsers.map((item) => {
                const name =
                  item.role === "student"
                    ? item.name || item.username
                    : "Professor";

                return (
                  <button
                    key={item.id}
                    onClick={() => openChat(item)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      borderRadius: "12px",
                      padding: "13px",
                      marginBottom: "6px",
                      cursor: "pointer",
                      background:
                        selected?.id === item.id ? "#eaf0ff" : "transparent",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          background: "#e8edff",
                          color: "#3448b8",
                          fontWeight: 700,
                        }}
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <strong style={{ display: "block", fontSize: "14px", color: "#182033" }}>
                          {name}
                        </strong>
                        <span style={{ color: "#7a8499", fontSize: "12px" }}>
                          {item.role === "student"
                            ? item.roll_no || item.username
                            : "SkillPulse Professor"}
                        </span>
                      </div>

                      {item.unread_count > 0 && (
                        <span
                          style={{
                            minWidth: "20px",
                            height: "20px",
                            padding: "0 5px",
                            borderRadius: "10px",
                            display: "grid",
                            placeItems: "center",
                            background: "#ef4444",
                            color: "white",
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          {item.unread_count}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          {!selected ? (
            <div
              style={{
                flex: 1,
                display: "grid",
                placeItems: "center",
                color: "#718096",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "42px", marginBottom: "12px" }}>💬</div>
                <h3 style={{ color: "#25304a", margin: "0 0 8px" }}>
                  Start a conversation
                </h3>
                <p style={{ margin: 0 }}>Select someone from the list.</p>
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #e5e9f2",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: "#eef2ff",
                    color: "#3448b8",
                    fontWeight: 700,
                  }}
                >
                  {(selected.role === "student"
                    ? selected.name || selected.username
                    : "Professor"
                  ).charAt(0).toUpperCase()}
                </div>

                <div>
                  <strong style={{ display: "block", color: "#182033" }}>
                    {selected.role === "student"
                      ? selected.name || selected.username
                      : "Professor"}
                  </strong>
                  <span style={{ fontSize: "12px", color: "#7a8499" }}>
                    {selected.role === "student"
                      ? selected.roll_no || selected.username
                      : "SkillPulse Faculty"}
                  </span>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "22px",
                  background: "#fbfcff",
                }}
              >
                {chatLoading && chatMessages.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#718096", padding: "30px" }}>
                    Loading conversation...
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#718096", padding: "50px 20px" }}>
                    <div style={{ fontSize: "34px", marginBottom: "10px" }}>👋</div>
                    <strong style={{ color: "#344054" }}>No messages yet</strong>
                    <p style={{ marginTop: "6px" }}>Send the first message.</p>
                  </div>
                ) : (
                  chatMessages.map((item) => {
                    const mine =
                      String(item.sender_user_id) === String(user?.id);

                    return (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          justifyContent: mine ? "flex-end" : "flex-start",
                          marginBottom: "12px",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "72%",
                            padding: "11px 14px",
                            borderRadius: mine
                              ? "16px 16px 4px 16px"
                              : "16px 16px 16px 4px",
                            background: mine ? "#4054c5" : "#ffffff",
                            color: mine ? "#ffffff" : "#25304a",
                            border: mine ? "none" : "1px solid #e5e9f2",
                            boxShadow: "0 2px 8px rgba(20,30,60,0.04)",
                          }}
                        >
                          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
                            {item.message}
                          </div>
                          <div
                            style={{
                              fontSize: "10px",
                              marginTop: "5px",
                              opacity: 0.7,
                              textAlign: "right",
                            }}
                          >
                            {formatChatTime(item.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={sendChatMessage}
                style={{
                  display: "flex",
                  gap: "10px",
                  padding: "14px",
                  borderTop: "1px solid #e5e9f2",
                  background: "#fff",
                }}
              >
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    isProfessor
                      ? "Write a message to the student..."
                      : "Write a message to your professor..."
                  }
                  maxLength={2000}
                  style={{
                    flex: 1,
                    border: "1px solid #dce2ef",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    outline: "none",
                    fontSize: "14px",
                  }}
                />

                <button
                  type="submit"
                  className="primary-button"
                  disabled={chatLoading || !chatInput.trim()}
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  };

  // =====================================================
  // AUTH SCREEN
  // =====================================================

  if (!loggedIn) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-logo">SP</div>
            <h1>SkillPulse</h1>
            <p>College Skill Intelligence Platform</p>
          </div>

          {authMode === "login" && (
            <>
              <div className="login-heading">
                <h2>Welcome back</h2>
                <p>Sign in to continue to SkillPulse</p>
              </div>

              <form onSubmit={handleLogin}>
                <div className="login-field">
                  <label>Username</label>
                  <input
                    type="text"
                    placeholder="Enter username or roll number"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div className="login-field">
                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {loginError && (
                  <div className="login-error">{loginError}</div>
                )}

                <button
                  type="submit"
                  className="login-button"
                  disabled={loginLoading}
                >
                  {loginLoading ? "Signing in..." : "Sign In"}
                </button>
              </form>

              <div className="create-account-area">
                <span>Don't have an account?</span>
                <button
                  type="button"
                  className="create-account-link"
                  onClick={showRegister}
                >
                  Create Account
                </button>
              </div>

              <div className="login-demo">
                <div>
                  <strong>Professor</strong>
                  <span>professor / admin123</span>
                </div>

                <div>
                  <strong>Student</strong>
                  <span>Roll No / Roll No</span>
                </div>
              </div>
            </>
          )}

          {authMode === "register" && (
            <>
              <div className="login-heading">
                <h2>Create Account</h2>
                <p>Register as a SkillPulse student</p>
              </div>

              <form onSubmit={handleRegister}>
                <div className="login-field">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Enter your full name"
                    value={registerForm.name}
                    onChange={handleRegisterChange}
                  />
                </div>

                <div className="login-field">
                  <label>Roll Number</label>
                  <input
                    type="text"
                    name="roll_no"
                    placeholder="Enter your roll number"
                    value={registerForm.roll_no}
                    onChange={handleRegisterChange}
                  />
                </div>

                <div className="login-field">
                  <label>Username</label>
                  <input
                    type="text"
                    name="username"
                    placeholder="Choose a username"
                    value={registerForm.username}
                    onChange={handleRegisterChange}
                  />
                </div>

                <div className="login-field">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Minimum 6 characters"
                    value={registerForm.password}
                    onChange={handleRegisterChange}
                  />
                </div>

                <div className="login-field">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    name="confirm_password"
                    placeholder="Re-enter your password"
                    value={registerForm.confirm_password}
                    onChange={handleRegisterChange}
                  />
                </div>

                <div className="login-field">
                  <label>
                    Skills <span className="optional-text">Optional</span>
                  </label>
                  <input
                    type="text"
                    name="skills"
                    placeholder="Python, DSA, Java"
                    value={registerForm.skills}
                    onChange={handleRegisterChange}
                  />
                </div>

                <div className="login-field">
                  <label>
                    Interests <span className="optional-text">Optional</span>
                  </label>
                  <textarea
                    name="interests"
                    placeholder="Web Development, Cyber Security..."
                    value={registerForm.interests}
                    onChange={handleRegisterChange}
                    rows="3"
                  />
                </div>

                {registerError && (
                  <div className="login-error">{registerError}</div>
                )}

                {registerSuccess && (
                  <div className="login-success">{registerSuccess}</div>
                )}

                <button
                  type="submit"
                  className="login-button"
                  disabled={registerLoading}
                >
                  {registerLoading
                    ? "Creating Account..."
                    : "Create Account"}
                </button>
              </form>

              <div className="create-account-area">
                <span>Already have an account?</span>
                <button
                  type="button"
                  className="create-account-link"
                  onClick={showLogin}
                >
                  Sign In
                </button>
              </div>
            </>
          )}

          <div className="login-footer">
            SkillPulse • College Skill Intelligence
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // STUDENT LAYOUT
  // =====================================================

  if (user?.role === "student") {
    const student = studentProfile || user.student || {};
    const studentSkills = (student.skills || "")
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    const initials = (student.name || "S")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const studentNav = [
      { key: "Dashboard", icon: "▦", label: "Dashboard" },
      { key: "My Profile", icon: "👤", label: "My Profile" },
      { key: "My Skills", icon: "◈", label: "My Skills" },
      { key: "Add Skills", icon: "+", label: "Add Skills" },
      { key: "Special Classes", icon: "📚", label: "Special Classes" },
      { key: "Messages", icon: "💬", label: "Messages" },
      { key: "Notifications", icon: "🔔", label: "Notifications" },
      { key: "Settings", icon: "⚙", label: "Settings" },
    ];

    const renderStudentPage = () => {
      if (studentLoading && !student.name) {
        return (
          <div className="panel">
            <div className="empty">Loading your SkillPulse profile...</div>
          </div>
        );
      }

      if (page === "Dashboard") {
        return (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">🛠</div>
                <div>
                  <span>My Skills</span>
                  <h2>{studentSkills.length}</h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📚</div>
                <div>
                  <span>Special Classes</span>
                  <h2>{classes.length}</h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🎯</div>
                <div>
                  <span>Skill Matches</span>
                  <h2>{skills.length}</h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🔔</div>
                <div>
                  <span>Notifications</span>
                  <h2>{notificationList.length}</h2>
                </div>
              </div>
            </div>

            <div className="student-dashboard-grid">
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2>My Profile</h2>
                    <p>Your current SkillPulse information</p>
                  </div>

                  <button
                    className="text-button"
                    onClick={() => setPage("My Profile")}
                  >
                    Edit Profile →
                  </button>
                </div>

                <div className="profile-summary">
                  <div className="profile-avatar">{initials}</div>

                  <div className="profile-summary-info">
                    <h3>{student.name || "Student"}</h3>
                    <span>{student.roll_no || "Roll number not available"}</span>
                    <span>{user?.username || "Username"}</span>
                  </div>
                </div>

                <div className="profile-section">
                  <strong>Skills</strong>
                  <div className="tag-list">
                    {studentSkills.length ? (
                      studentSkills.map((skill) => (
                        <span className="tag" key={skill}>
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="muted-text">No skills added yet.</span>
                    )}
                  </div>
                </div>

                <div className="profile-section">
                  <strong>Interests</strong>
                  <p className="student-interest">
                    {student.interests || "Add your learning interests from My Profile."}
                  </p>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Recommended Focus</h2>
                    <p>Based on the college skill data</p>
                  </div>
                </div>

                <div className="signal-box">
                  <div className="signal-icon">🎯</div>

                  <span className="recommendation-label">
                    SkillPulse Insight
                  </span>

                  <h3>
                    {recommendation?.skill || "Keep building your skills"}
                  </h3>

                  <p>
                    {recommendation?.recommended
                      ? `${recommendation.count} students currently have this skill.`
                      : "Add more skills and interests to strengthen your profile."}
                  </p>

                  <div className="recommendation-reason">
                    <strong>Next step</strong>
                    <span>
                      {recommendation?.recommended
                        ? "Check Special Classes for topics related to current student demand."
                        : "Use Add Skills to keep your profile updated."}
                    </span>
                  </div>

                  <button
                    className="primary-button full"
                    onClick={() =>
                      setPage(
                        recommendation?.recommended
                          ? "Special Classes"
                          : "Add Skills"
                      )
                    }
                  >
                    {recommendation?.recommended
                      ? "View Special Classes"
                      : "Add My Skills"}
                  </button>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Upcoming Special Classes</h2>
                  <p>Sessions available for students</p>
                </div>

                <button
                  className="text-button"
                  onClick={() => setPage("Special Classes")}
                >
                  View All →
                </button>
              </div>

              <div className="class-list">
                {classes.length === 0 ? (
                  <div className="empty">No special classes scheduled.</div>
                ) : (
                  classes.slice(0, 4).map((item) => (
                    <div className="class-item" key={item.id}>
                      <div className="class-icon">📚</div>

                      <div className="class-details">
                        <h3>{item.topic}</h3>
                        <p>{item.description || "SkillPulse special class"}</p>
                        <span>
                          {item.class_date} • {item.class_time}
                        </span>
                      </div>

                      <button
                        className="small-button"
                        onClick={() => setPage("Special Classes")}
                      >
                        View
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        );
      }

      if (page === "My Profile") {
        return (
          <div className="panel form-panel student-form-panel">
            <div className="panel-header">
              <div>
                <h2>My Profile</h2>
                <p>View and update your personal SkillPulse profile</p>
              </div>

              <div className="profile-avatar small">
                {initials}
              </div>
            </div>

            <form onSubmit={saveStudentProfile}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    placeholder="Your full name"
                  />
                </div>

                <div className="form-group">
                  <label>Roll Number</label>
                  <input
                    value={student.roll_no || ""}
                    readOnly
                    className="readonly-field"
                  />
                  <small>Roll number is managed by the college.</small>
                </div>

                <div className="form-group">
                  <label>Username</label>
                  <input
                    value={user?.username || ""}
                    readOnly
                    className="readonly-field"
                  />
                </div>

                <div className="form-group">
                  <label>Account Type</label>
                  <input
                    value="Student"
                    readOnly
                    className="readonly-field"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Skills</label>
                  <input
                    name="skills"
                    value={profileForm.skills}
                    onChange={handleProfileChange}
                    placeholder="Python, DSA, Java, React"
                  />
                  <small>Separate multiple skills with commas.</small>
                </div>

                <div className="form-group full-width">
                  <label>Interests</label>
                  <textarea
                    name="interests"
                    value={profileForm.interests}
                    onChange={handleProfileChange}
                    placeholder="Cyber Security, Web Development..."
                  />
                </div>
              </div>

              {profileMessage && (
                <div className="profile-message">{profileMessage}</div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setPage("Dashboard")}
                >
                  Cancel
                </button>

                <button type="submit" className="primary-button">
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        );
      }

      if (page === "My Skills") {
        return (
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>My Skills</h2>
                <p>Manage the skills shown on your profile</p>
              </div>

              <button
                className="primary-button"
                onClick={() => setPage("Add Skills")}
              >
                + Add Skill
              </button>
            </div>

            {profileMessage && (
              <div className="profile-message">{profileMessage}</div>
            )}

            {studentSkills.length === 0 ? (
              <div className="empty">
                You have not added any skills yet.
              </div>
            ) : (
              <div className="my-skills-grid">
                {studentSkills.map((skill) => (
                  <div className="my-skill-card" key={skill}>
                    <div className="my-skill-icon">◈</div>

                    <div className="my-skill-info">
                      <strong>{skill}</strong>
                      <span>Added to your profile</span>
                    </div>

                    <button
                      className="small-button danger"
                      onClick={() => removeStudentSkill(skill)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      if (page === "Add Skills") {
        return (
          <div className="panel form-panel">
            <div className="panel-header">
              <div>
                <h2>Add Skills</h2>
                <p>Add a skill to your SkillPulse profile</p>
              </div>
            </div>

            <form onSubmit={addStudentSkill}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Skill Name</label>
                  <input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="Example: Python"
                  />
                </div>

                <div className="form-group">
                  <label>Skill Level</label>
                  <select
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value)}
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Current Skills</label>
                  <input
                    value={studentSkills.join(", ") || "None"}
                    readOnly
                    className="readonly-field"
                  />
                </div>
              </div>

              <div className="skill-level-note">
                Skill level is currently used as profile information. The
                college skill-demand analysis is based on the skill itself.
              </div>

              {profileMessage && (
                <div className="profile-message">{profileMessage}</div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setPage("My Skills")}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={studentLoading}
                >
                  {studentLoading ? "Adding..." : "Add Skill"}
                </button>
              </div>
            </form>
          </div>
        );
      }

      if (page === "Messages") {
      return renderChatPage(true);
    }

    if (page === "Special Classes") {
        return (
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Special Classes</h2>
                <p>Classes created from student skill demand</p>
              </div>
            </div>

            <div className="class-list">
              {classes.length === 0 ? (
                <div className="empty">No special classes scheduled.</div>
              ) : (
                classes.map((item) => (
                  <div className="class-item" key={item.id}>
                    <div className="class-icon">📚</div>

                    <div className="class-details">
                      <h3>{item.topic}</h3>
                      <p>
                        {item.description ||
                          "Special class created through SkillPulse."}
                      </p>
                      <span>
                        {item.class_date} • {item.class_time}
                      </span>
                    </div>

                    <button
                      className="small-button"
                      onClick={() =>
                        alert(
                          `Class: ${item.topic}\nDate: ${item.class_date}\nTime: ${item.class_time}`
                        )
                      }
                    >
                      View Details
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      }

      if (page === "Messages") {
        return renderChatPage(false);
      }

      if (page === "Notifications") {
        return (
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Notifications</h2>
                <p>Updates related to your SkillPulse activity</p>
              </div>
            </div>

            <div className="notification-list">
              {notificationList.length === 0 ? (
                <div className="empty">No new notifications.</div>
              ) : (
                notificationList.map((notification) => (
                  <div className="notification-item" key={notification.id}>
                    <div className="notification-icon">
                      {notification.icon}
                    </div>

                    <div>
                      <strong>{notification.title}</strong>
                      <p>{notification.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      }

      if (page === "Settings") {
        return (
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Settings</h2>
                <p>Basic account preferences</p>
              </div>
            </div>

            <div className="settings-list">
              <div className="settings-row">
                <div>
                  <strong>Class Notifications</strong>
                  <span>Receive updates when new classes are added.</span>
                </div>
                <span className="setting-status">ON</span>
              </div>

              <div className="settings-row">
                <div>
                  <strong>Profile Visibility</strong>
                  <span>Your skill information can be used for college skill analysis.</span>
                </div>
                <span className="setting-status">ON</span>
              </div>

              <div className="settings-row">
                <div>
                  <strong>Account Role</strong>
                  <span>Student account</span>
                </div>
                <span className="setting-status neutral">STUDENT</span>
              </div>
            </div>

            <div className="settings-note">
              To change your login password or other account credentials,
              contact the college administrator in this project version.
            </div>
          </div>
        );
      }

      return null;
    };

    return (
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">SP</div>

            <div>
              <h2>SkillPulse</h2>
              <span>Student Workspace</span>
            </div>
          </div>

          <nav className="menu">
            {studentNav.map((item) => (
              <button
                key={item.key}
                className={`menu-item ${
                  page === item.key ? "active" : ""
                }`}
                onClick={() => {
                  setPage(item.key);
                  if (item.key === "Messages") {
                    loadChatUsers(user);
                  }
                }}
              >
                <span className="menu-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.key === "Messages" && chatUnreadCount > 0 && (
                  <span
                    style={{
                      marginLeft: "auto",
                      minWidth: "20px",
                      height: "20px",
                      padding: "0 5px",
                      borderRadius: "10px",
                      display: "grid",
                      placeItems: "center",
                      background: "#ef4444",
                      color: "white",
                      fontSize: "10px",
                      fontWeight: 700,
                    }}
                  >
                    {chatUnreadCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <button
              className="logout-button sidebar-logout"
              onClick={handleLogout}
            >
              Logout
            </button>

            <p className="sidebar-note">
              Logged in as Student
            </p>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div>
              <h1>{page}</h1>
              <p>
                Welcome back, {user?.username || student.name || "Student"}
              </p>
            </div>

            <button
              className="refresh-button"
              onClick={() => loadStudentData(user)}
            >
              ↻ Refresh
            </button>
          </header>

          <section className="content">
            {renderStudentPage()}
          </section>
        </main>
      </div>
    );
  }

  // =====================================================
  // PROFESSOR PAGE RENDERER
  // =====================================================

  const renderProfessorPage = () => {
    if (page === "Dashboard") {
      return (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div>
                <span>Total Students</span>
                <h2>{stats?.total_students || 0}</h2>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🧠</div>
              <div>
                <span>Unique Skills</span>
                <h2>{stats?.total_skills || 0}</h2>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div>
                <span>Skill Entries</span>
                <h2>{stats?.total_skills || 0}</h2>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🏆</div>
              <div>
                <span>Top Skill</span>
                <h2>{skills[0]?.skill || "—"}</h2>
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Skill Demand</h2>
                  <p>Skills ranked by student demand</p>
                </div>

                <button
                  className="text-button"
                  onClick={() => setPage("Skill Analysis")}
                >
                  View Analysis →
                </button>
              </div>

              <div className="ranking-list">
                {skills.length === 0 ? (
                  <div className="empty">No skill data available.</div>
                ) : (
                  skills.slice(0, 6).map((item, index) => {
                    const max = skills[0]?.count || 1;
                    const percentage = (item.count / max) * 100;

                    return (
                      <div className="ranking-item" key={item.skill}>
                        <div className="rank">#{index + 1}</div>

                        <div className="ranking-info">
                          <strong>{item.skill}</strong>
                          <span>{item.count} students</span>
                        </div>

                        <div className="progress">
                          <div
                            className="progress-bar"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Class Recommendation</h2>
                  <p>Based on current skill demand</p>
                </div>
              </div>

              {recommendation?.recommended ? (
                <div className="signal-box">
                  <div className="signal-icon">🎯</div>

                  <span className="recommendation-label">
                    Recommended
                  </span>

                  <h3>{recommendation.skill}</h3>

                  <p>
                    {recommendation.count} students currently have this skill.
                  </p>

                  <div className="recommendation-reason">
                    <strong>Next step</strong>
                    <span>Consider creating a special class around this skill.
                    </span>
                  </div>

                  <button
                    className="primary-button full"
                    onClick={createRecommendedClass}
                  >
                    Create Recommended Class
                  </button>
                </div>
              ) : (
                <div className="empty">
                  Add more student skill data to generate a recommendation.
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Upcoming Special Classes</h2>
                <p>Recently scheduled sessions</p>
              </div>

              <button
                className="text-button"
                onClick={() => setPage("Special Classes")}
              >
                View All →
              </button>
            </div>

            <div className="class-list">
              {classes.length === 0 ? (
                <div className="empty">No special classes scheduled.</div>
              ) : (
                classes.slice(0, 4).map((item) => (
                  <div className="class-item" key={item.id}>
                    <div className="class-icon">📚</div>

                    <div className="class-details">
                      <h3>{item.topic}</h3>
                      <p>{item.description}</p>
                      <span>
                        {item.class_date} • {item.class_time}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      );
    }

    if (page === "Students") {
      return (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Students</h2>
              <p>Manage registered students</p>
            </div>

            <button
              className="primary-button"
              onClick={() => {
                setStudentForm(emptyStudent);
                setEditingStudent(null);
                setPage("Add Student");
              }}
            >
              + Add Student
            </button>
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name, roll number or skill..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Roll Number</th>
                  <th>Skills</th>
                  <th>Interests</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <strong>{student.name}</strong>
                    </td>

                    <td>{student.roll_no}</td>

                    <td>
                      <div className="tag-list">
                        {(student.skills || "")
                          .split(",")
                          .filter((skill) => skill.trim())
                          .map((skill, index) => (
                            <span className="tag" key={index}>
                              {skill.trim()}
                            </span>
                          ))}
                      </div>
                    </td>

                    <td>{student.interests || "—"}</td>

                    <td>
                      <div className="actions">
                        <button
                          className="small-button"
                          onClick={() => editStudent(student)}
                        >
                          Edit
                        </button>

                        <button
                          className="small-button danger"
                          onClick={() => deleteStudent(student.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredStudents.length === 0 && (
              <div className="empty">No students found.</div>
            )}
          </div>
        </div>
      );
    }

    if (page === "Add Student") {
      return (
        <div className="panel form-panel">
          <div className="panel-header">
            <div>
              <h2>{editingStudent ? "Edit Student" : "Add Student"}</h2>
              <p>
                {editingStudent
                  ? "Update student information"
                  : "Register a new student"}
              </p>
            </div>
          </div>

          <form onSubmit={saveStudent}>
            <div className="form-grid">
              <div className="form-group">
                <label>Student Name</label>
                <input
                  name="name"
                  value={studentForm.name}
                  onChange={handleStudentChange}
                  placeholder="Enter student name"
                />
              </div>

              <div className="form-group">
                <label>Roll Number</label>
                <input
                  name="roll_no"
                  value={studentForm.roll_no}
                  onChange={handleStudentChange}
                  placeholder="Enter roll number"
                />
              </div>

              <div className="form-group full-width">
                <label>Skills</label>
                <input
                  name="skills"
                  value={studentForm.skills}
                  onChange={handleStudentChange}
                  placeholder="Python, DSA, Java"
                />
                <small>Separate multiple skills with commas.</small>
              </div>

              <div className="form-group full-width">
                <label>Interests</label>
                <textarea
                  name="interests"
                  value={studentForm.interests}
                  onChange={handleStudentChange}
                  placeholder="Competitive Programming, Web Development..."
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setStudentForm(emptyStudent);
                  setEditingStudent(null);
                  setPage("Students");
                }}
              >
                Cancel
              </button>

              <button type="submit" className="primary-button">
                {editingStudent ? "Update Student" : "Add Student"}
              </button>
            </div>
          </form>
        </div>
      );
    }

    if (page === "Skill Analysis") {
      return (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Skill Analysis</h2>
              <p>Detailed student skill demand</p>
            </div>
          </div>

          <div className="ranking-list">
            {skills.map((item, index) => {
              const max = skills[0]?.count || 1;
              const percentage = (item.count / max) * 100;

              return (
                <div className="ranking-item" key={item.skill}>
                  <div className="rank">#{index + 1}</div>

                  <div className="ranking-info">
                    <strong>{item.skill}</strong>
                    <span>{item.count} students</span>
                  </div>

                  <div className="progress">
                    <div
                      className="progress-bar"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (page === "Create Special Class") {
      return (
        <div className="panel form-panel">
          <div className="panel-header">
            <div>
              <h2>Create Special Class</h2>
              <p>Schedule a class based on student demand</p>
            </div>
          </div>

          <form onSubmit={createClass}>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Topic</label>
                <input
                  name="topic"
                  value={classForm.topic}
                  onChange={handleClassChange}
                  placeholder="Python Special Class"
                />
              </div>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  name="class_date"
                  value={classForm.class_date}
                  onChange={handleClassChange}
                />
              </div>

              <div className="form-group">
                <label>Time</label>
                <input
                  type="time"
                  name="class_time"
                  value={classForm.class_time}
                  onChange={handleClassChange}
                />
              </div>

              <div className="form-group full-width">
                <label>Description</label>
                <textarea
                  name="description"
                  value={classForm.description}
                  onChange={handleClassChange}
                  placeholder="Describe the class..."
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPage("Special Classes")}
              >
                Cancel
              </button>

              <button type="submit" className="primary-button">
                Create Class
              </button>
            </div>
          </form>
        </div>
      );
    }

    if (page === "Special Classes") {
      return (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Special Classes</h2>
              <p>Manage scheduled skill sessions</p>
            </div>

            <button
              className="primary-button"
              onClick={() => {
                setClassForm(emptyClass);
                setPage("Create Special Class");
              }}
            >
              + Create Class
            </button>
          </div>

          <div className="class-list">
            {classes.length === 0 ? (
              <div className="empty">No special classes scheduled.</div>
            ) : (
              classes.map((item) => (
                <div className="class-item" key={item.id}>
                  <div className="class-icon">📚</div>

                  <div className="class-details">
                    <h3>{item.topic}</h3>
                    <p>{item.description}</p>
                    <span>
                      {item.class_date} • {item.class_time}
                    </span>
                  </div>

                  <button
                    className="delete-btn"
                    onClick={() => deleteClass(item.id)}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // =====================================================
  // PROFESSOR LAYOUT
  // =====================================================

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">SP</div>

          <div>
            <h2>SkillPulse</h2>
            <span>Skill Intelligence</span>
          </div>
        </div>

        <nav className="menu">
          <button
            className={`menu-item ${
              page === "Dashboard" ? "active" : ""
            }`}
            onClick={() => setPage("Dashboard")}
          >
            <span className="menu-icon">▦</span>
            <span>Dashboard</span>
          </button>

          <button
            className={`menu-item ${
              page === "Students" ? "active" : ""
            }`}
            onClick={() => setPage("Students")}
          >
            <span className="menu-icon">👥</span>
            <span>Students</span>
          </button>

          <button
            className={`menu-item ${
              page === "Skill Analysis" ? "active" : ""
            }`}
            onClick={() => setPage("Skill Analysis")}
          >
            <span className="menu-icon">◈</span>
            <span>Skill Analysis</span>
          </button>

          <button
            className={`menu-item ${
              page === "Add Student" ? "active" : ""
            }`}
            onClick={() => {
              setStudentForm(emptyStudent);
              setEditingStudent(null);
              setPage("Add Student");
            }}
          >
            <span className="menu-icon">+</span>
            <span>Add Student</span>
          </button>

          <button
            className={`menu-item ${
              page === "Messages" ? "active" : ""
            }`}
            onClick={() => {
              setPage("Messages");
              loadChatUsers(user);
            }}
          >
            <span className="menu-icon">💬</span>
            <span>Messages</span>
            {chatUnreadCount > 0 && (
              <span
                style={{
                  marginLeft: "auto",
                  minWidth: "20px",
                  height: "20px",
                  padding: "0 5px",
                  borderRadius: "10px",
                  display: "grid",
                  placeItems: "center",
                  background: "#ef4444",
                  color: "white",
                  fontSize: "10px",
                  fontWeight: 700,
                }}
              >
                {chatUnreadCount}
              </span>
            )}
          </button>

          <button
            className={`menu-item ${
              page === "Special Classes" ||
              page === "Create Special Class"
                ? "active"
                : ""
            }`}
            onClick={() => setPage("Special Classes")}
          >
            <span className="menu-icon">📚</span>
            <span>Special Classes</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button className="demo-button" onClick={loadDemoData}>
            Load Demo Data
          </button>

          <button
            className="logout-button sidebar-logout"
            onClick={handleLogout}
          >
            Logout
          </button>

          <p className="sidebar-note">Logged in as Professor</p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{page}</h1>
            <p>Welcome back, {user?.username}</p>
          </div>

          <button className="refresh-button" onClick={loadData}>
            ↻ Refresh
          </button>
        </header>

        <section className="content">
          {loading ? (
            <div className="panel">
              <div className="empty">Loading SkillPulse data...</div>
            </div>
          ) : (
            renderProfessorPage()
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
