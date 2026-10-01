from collections import defaultdict
import heapq


class SkillIndex:

    def __init__(self):
        # HashMap:
        # skill -> students
        self.skill_map = defaultdict(list)

        # Set:
        # duplicate student-skill entries prevent చేయడానికి
        self.student_seen = set()

    def add(self, skill, name, roll_no):

        skill = skill.strip().lower()

        if not skill:
            return

        key = (skill, roll_no)

        # Duplicate check
        if key not in self.student_seen:

            self.skill_map[skill].append({
                "name": name,
                "roll_no": roll_no
            })

            self.student_seen.add(key)

    def skill_demand(self):

        # Max Heap using negative values
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

        # Highest demand first
        return sorted(
            matches,
            key=lambda x: (-x["count"], x["skill"])
        )