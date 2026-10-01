from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from collections import defaultdict
import heapq
from datetime import datetime

app = Flask(__name__)
CORS(app)

DB_NAME = "skillpulse.db"


# =========================================================
# DATABASE
# =========================================================

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()

    # -------------------------
    # Students
    # -------------------------
    cur.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            roll_no TEXT UNIQUE NOT NULL,
            skills TEXT DEFAULT '',
            interests TEXT DEFAULT ''
        )
    """)

    # -------------------------
    # Special Classes
    # -------------------------
    cur.execute("""
        CREATE TABLE IF NOT EXISTS special_classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT NOT NULL,
            class_date TEXT NOT NULL,
            class_time TEXT NOT NULL,
            description TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # -------------------------
    # Users
    # -------------------------
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            student_id INTEGER,
            FOREIGN KEY(student_id) REFERENCES students(id)
        )
    """)

    # -------------------------
    # Chat Messages
    # -------------------------
    cur.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_user_id INTEGER NOT NULL,
            receiver_user_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(sender_user_id) REFERENCES users(id),
            FOREIGN KEY(receiver_user_id) REFERENCES users(id)
        )
    """)

    conn.commit()

    # =====================================================
    # DEFAULT PROFESSOR
    # =====================================================

    cur.execute(
        "SELECT id FROM users WHERE username = ?",
        ("professor",)
    )

    professor = cur.fetchone()

    if not professor:
        cur.execute("""
            INSERT INTO users
            (username, password, role, student_id)
            VALUES (?, ?, ?, ?)
        """, (
            "professor",
            "admin123",
            "professor",
            None
        ))

    conn.commit()

    # =====================================================
    # CREATE USER ACCOUNT FOR EXISTING STUDENTS
    # =====================================================

    students = cur.execute(
        "SELECT * FROM students"
    ).fetchall()

    for student in students:

        existing_user = cur.execute(
            "SELECT id FROM users WHERE student_id = ?",
            (student["id"],)
        ).fetchone()

        if not existing_user:

            username = student["roll_no"]
            password = student["roll_no"]

            # Avoid username collision
            username_exists = cur.execute(
                "SELECT id FROM users WHERE username = ?",
                (username,)
            ).fetchone()

            if not username_exists:
                cur.execute("""
                    INSERT INTO users
                    (username, password, role, student_id)
                    VALUES (?, ?, ?, ?)
                """, (
                    username,
                    password,
                    "student",
                    student["id"]
                ))

    conn.commit()
    conn.close()


# =========================================================
# DSA SKILL INDEX
# =========================================================

class SkillIndex:

    def __init__(self):
        self.skill_map = defaultdict(list)
        self.student_seen = set()

    def add(self, skill, name, roll_no):

        skill = skill.strip().lower()

        if not skill:
            return

        key = (skill, roll_no)

        if key not in self.student_seen:

            self.skill_map[skill].append({
                "name": name,
                "roll_no": roll_no
            })

            self.student_seen.add(key)

    def skill_demand(self):

        heap = []

        for skill, students in self.skill_map.items():

            heapq.heappush(
                heap,
                (-len(students), skill)
            )

        result = []

        while heap:

            count, skill = heapq.heappop(heap)

            result.append({
                "skill": skill.title(),
                "count": -count,
                "students": self.skill_map[skill]
            })

        return result

    def search(self, query):

        query = query.lower()

        matches = []

        for skill, students in self.skill_map.items():

            if query in skill:

                matches.append({
                    "skill": skill.title(),
                    "count": len(students),
                    "students": students
                })

        return sorted(
            matches,
            key=lambda x: (-x["count"], x["skill"])
        )


def build_skill_index():

    index = SkillIndex()

    conn = get_db()

    students = conn.execute(
        "SELECT * FROM students"
    ).fetchall()

    conn.close()

    for student in students:

        skills = student["skills"] or ""

        for skill in skills.split(","):

            if skill.strip():

                index.add(
                    skill,
                    student["name"],
                    student["roll_no"]
                )

    return index


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def student_to_dict(student):

    if not student:
        return None

    return {
        "id": student["id"],
        "name": student["name"],
        "roll_no": student["roll_no"],
        "skills": student["skills"] or "",
        "interests": student["interests"] or ""
    }


def user_to_dict(user):

    if not user:
        return None

    result = {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"]
    }

    if user["student_id"]:

        conn = get_db()

        student = conn.execute(
            "SELECT * FROM students WHERE id = ?",
            (user["student_id"],)
        ).fetchone()

        conn.close()

        result["student_id"] = user["student_id"]
        result["student"] = student_to_dict(student)

    else:

        result["student_id"] = None
        result["student"] = None

    return result


# =========================================================
# HOME
# =========================================================

@app.route("/")
def home():

    return jsonify({
        "message": "SkillPulse Backend is running",
        "status": "success"
    })


# =========================================================
# LOGIN
# =========================================================

@app.route("/api/login", methods=["POST"])
def login():

    data = request.get_json() or {}

    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:

        return jsonify({
            "message": "Username and password are required."
        }), 400

    conn = get_db()

    user = conn.execute("""
        SELECT *
        FROM users
        WHERE username = ?
        AND password = ?
    """, (
        username,
        password
    )).fetchone()

    conn.close()

    if not user:

        return jsonify({
            "message": "Invalid username or password."
        }), 401

    return jsonify({
        "message": "Login successful",
        "user": user_to_dict(user)
    })


# =========================================================
# REGISTER
# =========================================================

@app.route("/api/register", methods=["POST"])
def register():

    data = request.get_json() or {}

    name = data.get("name", "").strip()
    roll_no = data.get("roll_no", "").strip()
    username = data.get("username", "").strip()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")
    skills = data.get("skills", "").strip()
    interests = data.get("interests", "").strip()

    if not name:
        return jsonify({
            "message": "Name is required."
        }), 400

    if not roll_no:
        return jsonify({
            "message": "Roll number is required."
        }), 400

    if not username:
        return jsonify({
            "message": "Username is required."
        }), 400

    if not password:
        return jsonify({
            "message": "Password is required."
        }), 400

    if len(password) < 6:
        return jsonify({
            "message": "Password must contain at least 6 characters."
        }), 400

    if password != confirm_password:
        return jsonify({
            "message": "Passwords do not match."
        }), 400

    conn = get_db()

    # Duplicate roll number
    existing_student = conn.execute("""
        SELECT id
        FROM students
        WHERE roll_no = ?
    """, (roll_no,)).fetchone()

    if existing_student:

        conn.close()

        return jsonify({
            "message": "Roll number already registered."
        }), 409

    # Duplicate username
    existing_user = conn.execute("""
        SELECT id
        FROM users
        WHERE username = ?
    """, (username,)).fetchone()

    if existing_user:

        conn.close()

        return jsonify({
            "message": "Username already exists."
        }), 409

    try:

        cur = conn.cursor()

        cur.execute("""
            INSERT INTO students
            (name, roll_no, skills, interests)
            VALUES (?, ?, ?, ?)
        """, (
            name,
            roll_no,
            skills,
            interests
        ))

        student_id = cur.lastrowid

        cur.execute("""
            INSERT INTO users
            (username, password, role, student_id)
            VALUES (?, ?, ?, ?)
        """, (
            username,
            password,
            "student",
            student_id
        ))

        conn.commit()

        student = conn.execute("""
            SELECT *
            FROM students
            WHERE id = ?
        """, (student_id,)).fetchone()

        user = conn.execute("""
            SELECT *
            FROM users
            WHERE id = ?
        """, (cur.lastrowid,)).fetchone()

        conn.close()

        return jsonify({
            "message": "Account created successfully.",
            "user": user_to_dict(user),
            "student": student_to_dict(student)
        }), 201

    except Exception as error:

        conn.rollback()
        conn.close()

        return jsonify({
            "message": str(error)
        }), 500


# =========================================================
# STUDENTS - GET
# =========================================================

@app.route("/api/students", methods=["GET"])
def get_students():

    conn = get_db()

    students = conn.execute("""
        SELECT *
        FROM students
        ORDER BY id DESC
    """).fetchall()

    conn.close()

    return jsonify([
        student_to_dict(student)
        for student in students
    ])


# =========================================================
# STUDENTS - CREATE
# =========================================================

@app.route("/api/students", methods=["POST"])
def create_student():

    data = request.get_json() or {}

    name = data.get("name", "").strip()
    roll_no = data.get("roll_no", "").strip()
    skills = data.get("skills", "").strip()
    interests = data.get("interests", "").strip()

    if not name or not roll_no:

        return jsonify({
            "message": "Name and roll number are required."
        }), 400

    conn = get_db()

    existing = conn.execute("""
        SELECT id
        FROM students
        WHERE roll_no = ?
    """, (roll_no,)).fetchone()

    if existing:

        conn.close()

        return jsonify({
            "message": "Roll number already exists."
        }), 409

    try:

        cur = conn.cursor()

        cur.execute("""
            INSERT INTO students
            (name, roll_no, skills, interests)
            VALUES (?, ?, ?, ?)
        """, (
            name,
            roll_no,
            skills,
            interests
        ))

        student_id = cur.lastrowid

        # Create default login account
        username = roll_no
        password = roll_no

        username_exists = conn.execute("""
            SELECT id
            FROM users
            WHERE username = ?
        """, (username,)).fetchone()

        if not username_exists:

            cur.execute("""
                INSERT INTO users
                (username, password, role, student_id)
                VALUES (?, ?, ?, ?)
            """, (
                username,
                password,
                "student",
                student_id
            ))

        conn.commit()

        student = conn.execute("""
            SELECT *
            FROM students
            WHERE id = ?
        """, (student_id,)).fetchone()

        conn.close()

        return jsonify({
            "message": "Student created successfully.",
            "student": student_to_dict(student)
        }), 201

    except Exception as error:

        conn.rollback()
        conn.close()

        return jsonify({
            "message": str(error)
        }), 500


# =========================================================
# UPDATE STUDENT
# =========================================================

@app.route("/api/students/<int:student_id>", methods=["PUT"])
def update_student(student_id):

    data = request.get_json() or {}

    name = data.get("name", "").strip()
    roll_no = data.get("roll_no", "").strip()
    skills = data.get("skills", "").strip()
    interests = data.get("interests", "").strip()

    if not name or not roll_no:

        return jsonify({
            "message": "Name and roll number are required."
        }), 400

    conn = get_db()

    current_student = conn.execute("""
        SELECT *
        FROM students
        WHERE id = ?
    """, (student_id,)).fetchone()

    if not current_student:

        conn.close()

        return jsonify({
            "message": "Student not found."
        }), 404

    old_roll_no = current_student["roll_no"]

    duplicate = conn.execute("""
        SELECT id
        FROM students
        WHERE roll_no = ?
        AND id != ?
    """, (
        roll_no,
        student_id
    )).fetchone()

    if duplicate:

        conn.close()

        return jsonify({
            "message": "Roll number already exists."
        }), 409

    try:

        conn.execute("""
            UPDATE students
            SET name = ?,
                roll_no = ?,
                skills = ?,
                interests = ?
            WHERE id = ?
        """, (
            name,
            roll_no,
            skills,
            interests,
            student_id
        ))

        # Update default account only if username
        # was previously equal to old roll number
        user = conn.execute("""
            SELECT *
            FROM users
            WHERE student_id = ?
        """, (student_id,)).fetchone()

        if user:

            if user["username"] == old_roll_no:

                conn.execute("""
                    UPDATE users
                    SET username = ?,
                        password = ?
                    WHERE student_id = ?
                """, (
                    roll_no,
                    roll_no,
                    student_id
                ))

        conn.commit()

        student = conn.execute("""
            SELECT *
            FROM students
            WHERE id = ?
        """, (student_id,)).fetchone()

        conn.close()

        return jsonify({
            "message": "Student updated successfully.",
            "student": student_to_dict(student)
        })

    except Exception as error:

        conn.rollback()
        conn.close()

        return jsonify({
            "message": str(error)
        }), 500


# =========================================================
# DELETE STUDENT
# =========================================================

@app.route("/api/students/<int:student_id>", methods=["DELETE"])
def delete_student(student_id):

    conn = get_db()

    student = conn.execute("""
        SELECT *
        FROM students
        WHERE id = ?
    """, (student_id,)).fetchone()

    if not student:

        conn.close()

        return jsonify({
            "message": "Student not found."
        }), 404

    try:

        user = conn.execute("""
            SELECT id
            FROM users
            WHERE student_id = ?
        """, (student_id,)).fetchone()

        if user:

            # Delete chat messages belonging to user
            conn.execute("""
                DELETE FROM messages
                WHERE sender_user_id = ?
                OR receiver_user_id = ?
            """, (
                user["id"],
                user["id"]
            ))

            conn.execute("""
                DELETE FROM users
                WHERE id = ?
            """, (user["id"],))

        conn.execute("""
            DELETE FROM students
            WHERE id = ?
        """, (student_id,))

        conn.commit()
        conn.close()

        return jsonify({
            "message": "Student deleted successfully."
        })

    except Exception as error:

        conn.rollback()
        conn.close()

        return jsonify({
            "message": str(error)
        }), 500


# =========================================================
# STUDENT PROFILE
# =========================================================

@app.route("/api/students/<int:student_id>/profile", methods=["GET"])
def get_student_profile(student_id):

    conn = get_db()

    student = conn.execute("""
        SELECT *
        FROM students
        WHERE id = ?
    """, (student_id,)).fetchone()

    conn.close()

    if not student:

        return jsonify({
            "message": "Student not found."
        }), 404

    return jsonify(student_to_dict(student))


@app.route("/api/students/<int:student_id>/profile", methods=["PUT"])
def update_student_profile(student_id):

    data = request.get_json() or {}

    name = data.get("name", "").strip()
    skills = data.get("skills", "").strip()
    interests = data.get("interests", "").strip()

    if not name:

        return jsonify({
            "message": "Name is required."
        }), 400

    conn = get_db()

    student = conn.execute("""
        SELECT *
        FROM students
        WHERE id = ?
    """, (student_id,)).fetchone()

    if not student:

        conn.close()

        return jsonify({
            "message": "Student not found."
        }), 404

    conn.execute("""
        UPDATE students
        SET name = ?,
            skills = ?,
            interests = ?
        WHERE id = ?
    """, (
        name,
        skills,
        interests,
        student_id
    ))

    conn.commit()

    updated = conn.execute("""
        SELECT *
        FROM students
        WHERE id = ?
    """, (student_id,)).fetchone()

    conn.close()

    return jsonify({
        "message": "Profile updated successfully.",
        "student": student_to_dict(updated)
    })


# =========================================================
# STUDENT SKILLS
# =========================================================

@app.route("/api/students/<int:student_id>/skills", methods=["GET"])
def get_student_skills(student_id):

    conn = get_db()

    student = conn.execute("""
        SELECT skills
        FROM students
        WHERE id = ?
    """, (student_id,)).fetchone()

    conn.close()

    if not student:

        return jsonify({
            "message": "Student not found."
        }), 404

    skills = [
        skill.strip()
        for skill in (student["skills"] or "").split(",")
        if skill.strip()
    ]

    return jsonify(skills)


@app.route("/api/students/<int:student_id>/skills", methods=["POST"])
def add_student_skill(student_id):

    data = request.get_json() or {}

    new_skill = data.get("skill", "").strip()

    if not new_skill:

        return jsonify({
            "message": "Skill is required."
        }), 400

    conn = get_db()

    student = conn.execute("""
        SELECT *
        FROM students
        WHERE id = ?
    """, (student_id,)).fetchone()

    if not student:

        conn.close()

        return jsonify({
            "message": "Student not found."
        }), 404

    current_skills = [
        skill.strip()
        for skill in (student["skills"] or "").split(",")
        if skill.strip()
    ]

    if any(
        skill.lower() == new_skill.lower()
        for skill in current_skills
    ):

        conn.close()

        return jsonify({
            "message": "Skill already exists."
        }), 409

    current_skills.append(new_skill)

    updated_skills = ", ".join(current_skills)

    conn.execute("""
        UPDATE students
        SET skills = ?
        WHERE id = ?
    """, (
        updated_skills,
        student_id
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "message": "Skill added successfully.",
        "skills": current_skills
    })


@app.route("/api/students/<int:student_id>/skills", methods=["DELETE"])
def delete_student_skill(student_id):

    data = request.get_json() or {}

    skill_to_remove = data.get("skill", "").strip()

    if not skill_to_remove:

        return jsonify({
            "message": "Skill is required."
        }), 400

    conn = get_db()

    student = conn.execute("""
        SELECT *
        FROM students
        WHERE id = ?
    """, (student_id,)).fetchone()

    if not student:

        conn.close()

        return jsonify({
            "message": "Student not found."
        }), 404

    skills = [
        skill.strip()
        for skill in (student["skills"] or "").split(",")
        if skill.strip()
    ]

    updated_skills = [
        skill
        for skill in skills
        if skill.lower() != skill_to_remove.lower()
    ]

    conn.execute("""
        UPDATE students
        SET skills = ?
        WHERE id = ?
    """, (
        ", ".join(updated_skills),
        student_id
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "message": "Skill removed successfully.",
        "skills": updated_skills
    })


# =========================================================
# STATS
# =========================================================

@app.route("/api/stats", methods=["GET"])
def get_stats():

    conn = get_db()

    total_students = conn.execute("""
        SELECT COUNT(*) AS count
        FROM students
    """).fetchone()["count"]

    total_classes = conn.execute("""
        SELECT COUNT(*) AS count
        FROM special_classes
    """).fetchone()["count"]

    conn.close()

    index = build_skill_index()

    total_skills = len(index.skill_map)

    return jsonify({
        "total_students": total_students,
        "total_skills": total_skills,
        "total_classes": total_classes
    })


# =========================================================
# SKILLS
# =========================================================

@app.route("/api/skills", methods=["GET"])
def get_skills():

    index = build_skill_index()

    return jsonify(
        index.skill_demand()
    )


@app.route("/api/skills/search", methods=["GET"])
def search_skills():

    query = request.args.get(
        "q",
        ""
    ).strip()

    if not query:

        return jsonify([])

    index = build_skill_index()

    return jsonify(
        index.search(query)
    )


# =========================================================
# RECOMMENDATION
# =========================================================

@app.route("/api/recommendation", methods=["GET"])
def recommendation():

    index = build_skill_index()

    ranking = index.skill_demand()

    if not ranking:

        return jsonify({
            "recommended": False,
            "skill": None,
            "count": 0
        })

    top_skill = ranking[0]

    return jsonify({
        "recommended": True,
        "skill": top_skill["skill"],
        "count": top_skill["count"]
    })


# =========================================================
# SPECIAL CLASSES
# =========================================================

@app.route("/api/classes", methods=["GET"])
def get_classes():

    conn = get_db()

    classes = conn.execute("""
        SELECT *
        FROM special_classes
        ORDER BY class_date ASC, class_time ASC
    """).fetchall()

    conn.close()

    return jsonify([
        dict(item)
        for item in classes
    ])


@app.route("/api/classes", methods=["POST"])
def create_class():

    data = request.get_json() or {}

    topic = data.get("topic", "").strip()
    class_date = data.get("class_date", "").strip()
    class_time = data.get("class_time", "").strip()
    description = data.get("description", "").strip()

    if not topic:
        return jsonify({
            "message": "Topic is required."
        }), 400

    if not class_date:
        return jsonify({
            "message": "Class date is required."
        }), 400

    if not class_time:
        return jsonify({
            "message": "Class time is required."
        }), 400

    conn = get_db()

    cur = conn.cursor()

    cur.execute("""
        INSERT INTO special_classes
        (topic, class_date, class_time, description)
        VALUES (?, ?, ?, ?)
    """, (
        topic,
        class_date,
        class_time,
        description
    ))

    class_id = cur.lastrowid

    conn.commit()

    item = conn.execute("""
        SELECT *
        FROM special_classes
        WHERE id = ?
    """, (class_id,)).fetchone()

    conn.close()

    return jsonify({
        "message": "Special class created successfully.",
        "class": dict(item)
    }), 201


@app.route("/api/classes/<int:class_id>", methods=["DELETE"])
def delete_class(class_id):

    conn = get_db()

    existing = conn.execute("""
        SELECT id
        FROM special_classes
        WHERE id = ?
    """, (class_id,)).fetchone()

    if not existing:

        conn.close()

        return jsonify({
            "message": "Class not found."
        }), 404

    conn.execute("""
        DELETE FROM special_classes
        WHERE id = ?
    """, (class_id,))

    conn.commit()
    conn.close()

    return jsonify({
        "message": "Special class deleted successfully."
    })


# =========================================================
# DEMO DATA
# =========================================================

@app.route("/api/demo", methods=["POST"])
def create_demo_data():

    demo_students = [
        {
            "name": "Rahul",
            "roll_no": "23A01",
            "skills": "Python, DSA, SQL",
            "interests": "Backend Development"
        },
        {
            "name": "Priya",
            "roll_no": "23A02",
            "skills": "Java, DSA, React",
            "interests": "Full Stack Development"
        },
        {
            "name": "Kiran",
            "roll_no": "23A03",
            "skills": "Python, Cyber Security, Linux",
            "interests": "Cyber Security"
        },
        {
            "name": "Anjali",
            "roll_no": "23A04",
            "skills": "UI/UX, React, JavaScript",
            "interests": "Design"
        }
    ]

    conn = get_db()

    created = 0

    for item in demo_students:

        existing = conn.execute("""
            SELECT id
            FROM students
            WHERE roll_no = ?
        """, (
            item["roll_no"],
        )).fetchone()

        if existing:
            continue

        cur = conn.cursor()

        cur.execute("""
            INSERT INTO students
            (name, roll_no, skills, interests)
            VALUES (?, ?, ?, ?)
        """, (
            item["name"],
            item["roll_no"],
            item["skills"],
            item["interests"]
        ))

        student_id = cur.lastrowid

        cur.execute("""
            INSERT INTO users
            (username, password, role, student_id)
            VALUES (?, ?, ?, ?)
        """, (
            item["roll_no"],
            item["roll_no"],
            "student",
            student_id
        ))

        created += 1

    conn.commit()
    conn.close()

    return jsonify({
        "message": "Demo data processed successfully.",
        "created": created
    })


# =========================================================
# =========================================================
# CHAT SYSTEM
# =========================================================
# =========================================================


# ---------------------------------------------------------
# Get Chat Users
# ---------------------------------------------------------

@app.route("/api/chat/users", methods=["GET"])
def get_chat_users():

    user_id = request.args.get("user_id")

    if not user_id:

        return jsonify({
            "message": "user_id is required."
        }), 400

    conn = get_db()

    current_user = conn.execute("""
        SELECT *
        FROM users
        WHERE id = ?
    """, (user_id,)).fetchone()

    if not current_user:

        conn.close()

        return jsonify({
            "message": "User not found."
        }), 404

    # Professor sees all students
    if current_user["role"] == "professor":

        users = conn.execute("""
            SELECT
                u.id,
                u.username,
                u.role,
                u.student_id,
                s.name,
                s.roll_no
            FROM users u
            LEFT JOIN students s
                ON u.student_id = s.id
            WHERE u.role = 'student'
            ORDER BY s.name ASC
        """).fetchall()

    # Student sees professor
    else:

        users = conn.execute("""
            SELECT
                id,
                username,
                role,
                student_id
            FROM users
            WHERE role = 'professor'
            ORDER BY username ASC
        """).fetchall()

    result = []

    for user in users:

        # Unread count
        unread = conn.execute("""
            SELECT COUNT(*) AS count
            FROM messages
            WHERE sender_user_id = ?
            AND receiver_user_id = ?
            AND is_read = 0
        """, (
            user["id"],
            current_user["id"]
        )).fetchone()["count"]

        item = {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "student_id": user["student_id"],
            "unread_count": unread
        }

        if user["role"] == "student":

            item["name"] = user["name"]
            item["roll_no"] = user["roll_no"]

        result.append(item)

    conn.close()

    return jsonify(result)


# ---------------------------------------------------------
# Get Conversation
# ---------------------------------------------------------

@app.route("/api/chat/<int:other_user_id>", methods=["GET"])
def get_conversation(other_user_id):

    user_id = request.args.get("user_id")

    if not user_id:

        return jsonify({
            "message": "user_id is required."
        }), 400

    try:
        user_id = int(user_id)
    except ValueError:

        return jsonify({
            "message": "Invalid user_id."
        }), 400

    conn = get_db()

    current_user = conn.execute("""
        SELECT *
        FROM users
        WHERE id = ?
    """, (user_id,)).fetchone()

    other_user = conn.execute("""
        SELECT *
        FROM users
        WHERE id = ?
    """, (other_user_id,)).fetchone()

    if not current_user or not other_user:

        conn.close()

        return jsonify({
            "message": "User not found."
        }), 404

    messages = conn.execute("""
        SELECT
            m.id,
            m.sender_user_id,
            m.receiver_user_id,
            m.message,
            m.is_read,
            m.created_at,
            su.username AS sender_username,
            ru.username AS receiver_username
        FROM messages m
        JOIN users su
            ON m.sender_user_id = su.id
        JOIN users ru
            ON m.receiver_user_id = ru.id
        WHERE
            (
                m.sender_user_id = ?
                AND m.receiver_user_id = ?
            )
            OR
            (
                m.sender_user_id = ?
                AND m.receiver_user_id = ?
            )
        ORDER BY m.created_at ASC, m.id ASC
    """, (
        user_id,
        other_user_id,
        other_user_id,
        user_id
    )).fetchall()

    # Mark received messages as read
    conn.execute("""
        UPDATE messages
        SET is_read = 1
        WHERE sender_user_id = ?
        AND receiver_user_id = ?
    """, (
        other_user_id,
        user_id
    ))

    conn.commit()
    conn.close()

    return jsonify([
        dict(message)
        for message in messages
    ])


# ---------------------------------------------------------
# Send Message
# ---------------------------------------------------------

@app.route("/api/chat/send", methods=["POST"])
def send_message():

    data = request.get_json() or {}

    sender_user_id = data.get("sender_user_id")
    receiver_user_id = data.get("receiver_user_id")
    message = data.get("message", "").strip()

    if not sender_user_id:

        return jsonify({
            "message": "sender_user_id is required."
        }), 400

    if not receiver_user_id:

        return jsonify({
            "message": "receiver_user_id is required."
        }), 400

    if not message:

        return jsonify({
            "message": "Message cannot be empty."
        }), 400

    if len(message) > 2000:

        return jsonify({
            "message": "Message is too long. Maximum 2000 characters."
        }), 400

    conn = get_db()

    sender = conn.execute("""
        SELECT *
        FROM users
        WHERE id = ?
    """, (sender_user_id,)).fetchone()

    receiver = conn.execute("""
        SELECT *
        FROM users
        WHERE id = ?
    """, (receiver_user_id,)).fetchone()

    if not sender or not receiver:

        conn.close()

        return jsonify({
            "message": "Sender or receiver not found."
        }), 404

    # -----------------------------------------------------
    # Only Student <-> Professor chat
    # -----------------------------------------------------

    valid_chat = (
        (
            sender["role"] == "student"
            and receiver["role"] == "professor"
        )
        or
        (
            sender["role"] == "professor"
            and receiver["role"] == "student"
        )
    )

    if not valid_chat:

        conn.close()

        return jsonify({
            "message": "Chat is available only between students and professors."
        }), 403

    cur = conn.cursor()

    cur.execute("""
        INSERT INTO messages
        (
            sender_user_id,
            receiver_user_id,
            message,
            is_read
        )
        VALUES (?, ?, ?, ?)
    """, (
        sender_user_id,
        receiver_user_id,
        message,
        0
    ))

    message_id = cur.lastrowid

    conn.commit()

    new_message = conn.execute("""
        SELECT
            m.id,
            m.sender_user_id,
            m.receiver_user_id,
            m.message,
            m.is_read,
            m.created_at,
            su.username AS sender_username,
            ru.username AS receiver_username
        FROM messages m
        JOIN users su
            ON m.sender_user_id = su.id
        JOIN users ru
            ON m.receiver_user_id = ru.id
        WHERE m.id = ?
    """, (
        message_id,
    )).fetchone()

    conn.close()

    return jsonify({
        "message": "Message sent successfully.",
        "data": dict(new_message)
    }), 201


# ---------------------------------------------------------
# Unread Count
# ---------------------------------------------------------

@app.route("/api/chat/unread-count", methods=["GET"])
def unread_count():

    user_id = request.args.get("user_id")

    if not user_id:

        return jsonify({
            "message": "user_id is required."
        }), 400

    conn = get_db()

    result = conn.execute("""
        SELECT COUNT(*) AS count
        FROM messages
        WHERE receiver_user_id = ?
        AND is_read = 0
    """, (
        user_id,
    )).fetchone()

    conn.close()

    return jsonify({
        "unread_count": result["count"]
    })


# ---------------------------------------------------------
# Mark Conversation Read
# ---------------------------------------------------------

@app.route("/api/chat/read/<int:other_user_id>", methods=["PUT"])
def mark_chat_read(other_user_id):

    user_id = request.args.get("user_id")

    if not user_id:

        return jsonify({
            "message": "user_id is required."
        }), 400

    conn = get_db()

    conn.execute("""
        UPDATE messages
        SET is_read = 1
        WHERE sender_user_id = ?
        AND receiver_user_id = ?
    """, (
        other_user_id,
        user_id
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "message": "Messages marked as read."
    })


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":

    init_db()

    print("")
    print("===================================")
    print("        SKILLPULSE BACKEND")
    print("===================================")
    print("Server: http://127.0.0.1:5000")
    print("")
    print("PROFESSOR LOGIN")
    print("Username: professor")
    print("Password: admin123")
    print("")
    print("CHAT SYSTEM: ENABLED")
    print("===================================")
    print("")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )