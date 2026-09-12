"""IELTS Practice web server.

Serves native HTML + Tailwind frontend and JSON API without Streamlit.
Run with: python website.py
"""

from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
from urllib.parse import urlparse

import requests
from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent
INDEX_FILE = ROOT / "index.html"
DATA_FILE = ROOT / "ielts_progress.json"
HOST = "127.0.0.1"
PORT = 8501
AI_API_URL = os.getenv("AI_API_URL", "").strip()
AI_MODEL = os.getenv("AI_MODEL", "").strip()

READING_PASSAGES = [
    {
        "id": "r1",
        "title": "The Rise of Urban Beekeeping",
        "level": "Academic Reading · Passage 01",
        "text": (
            "Over the past decade, city dwellers across the world have taken up "
            "beekeeping as a hobby and, increasingly, as a small business. Rooftops "
            "in cities such as London, New York and Tokyo now host thousands of hives. "
            "Proponents argue that urban bees are often healthier than their rural "
            "counterparts, since cities tend to have a greater diversity of flowering "
            "plants and lower pesticide use than industrial farmland. Critics, however, "
            "warn that packing too many hives into a small area can lead to competition "
            "for nectar, potentially harming wild pollinator populations that were "
            "already under pressure."
        ),
        "questions": [
            {
                "q": "According to the passage, why might urban bees be healthier than rural bees?",
                "options": [
                    "Cities have fewer flowering plants",
                    "Cities often have lower pesticide use and more plant diversity",
                    "Urban beekeepers use more medication",
                    "Rural areas have more predators",
                ],
                "answer": 1,
            },
            {
                "q": "What concern do critics raise about urban beekeeping?",
                "options": [
                    "It is too expensive",
                    "It requires too much space",
                    "Too many hives may compete with wild pollinators",
                    "Honey quality is lower in cities",
                ],
                "answer": 2,
            },
        ],
    },
]

WRITING_PROMPTS = [
    "Some people believe that unpaid community service should be a compulsory part of high school education. To what extent do you agree or disagree?",
    "The chart below shows the percentage of households with internet access in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features.",
]


def default_progress():
    return {"reading": [], "writing": []}


def load_progress():
    try:
        if DATA_FILE.exists():
            data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
            return {
                "reading": data.get("reading", []),
                "writing": data.get("writing", []),
            }
    except (OSError, json.JSONDecodeError):
        pass
    return default_progress()


def save_progress(data):
    DATA_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def heuristic_writing_feedback(essay, task_type="task2"):
    words = re.findall(r"\b\w+\b", essay)
    word_count = len(words)
    sentences = [s.strip() for s in re.split(r"[.!?]+", essay) if s.strip()]
    sentence_count = len(sentences)
    avg_sentence_len = word_count / sentence_count if sentence_count else 0
    min_words = 250 if task_type == "task2" else 150
    notes = []

    if word_count < min_words:
        notes.append(f"Word count is {word_count}; aim for at least {min_words}.")
    else:
        notes.append(f"Word count OK ({word_count} words).")

    if avg_sentence_len < 8:
        notes.append("Sentences look short/simple on average — try combining ideas with linking words.")
    elif avg_sentence_len > 30:
        notes.append("Average sentence length is very high — check for run-on sentences.")
    else:
        notes.append("Sentence length variation looks reasonable.")

    linking_words = [
        "however", "therefore", "furthermore", "moreover", "in contrast",
        "as a result", "for example", "in addition", "on the other hand",
    ]
    used_links = [word for word in linking_words if word in essay.lower()]
    if len(used_links) >= 2:
        notes.append(f"Good use of cohesive devices ({', '.join(used_links)}).")
    else:
        notes.append("Try using more linking phrases to improve coherence and cohesion.")

    band_estimate = 5.0
    if word_count >= min_words:
        band_estimate += 0.5
    if 8 <= avg_sentence_len <= 25:
        band_estimate += 0.5
    if len(used_links) >= 2:
        band_estimate += 1.0

    return {
        "band_estimate": round(min(band_estimate, 8.0), 1),
        "notes": notes,
        "word_count": word_count,
        "sentence_count": sentence_count,
    }


def groq_request(system_prompt, user_prompt, api_key, max_tokens, temperature):
    if not AI_API_URL or not AI_MODEL:
        raise RuntimeError("AI provider is not configured on server.")
    response = requests.post(
        AI_API_URL,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": AI_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


def ai_writing_feedback(essay, prompt, api_key):
    system_prompt = (
        "You are an official IELTS Writing examiner. Grade the essay against the four IELTS band criteria: "
        "Task Achievement, Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy. "
        "Respond ONLY in raw JSON, no markdown fences, no preamble, in this exact shape: "
        '{"band_estimate": <number 1-9, one decimal place>, '
        '"task_achievement_band": <number 1-9, one decimal place>, '
        '"coherence_cohesion_band": <number 1-9, one decimal place>, '
        '"lexical_resource_band": <number 1-9, one decimal place>, '
        '"grammar_band": <number 1-9, one decimal place>, '
        '"task_achievement": "<one sentence>", "coherence_cohesion": "<one sentence>", '
        '"lexical_resource": "<one sentence>", "grammar": "<one sentence>", '
        '"overall_tip": "<one sentence, the single most useful thing to fix next>"}'
    )
    raw = groq_request(system_prompt, f"Prompt: {prompt}\n\nEssay:\n{essay}", api_key, 500, 0.3)
    raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(raw)


def explain_answer(question, user_answer, correct_answer, api_key):
    system_prompt = (
        "You are an IELTS tutor. A student got a practice question wrong or wants to understand it better. "
        "Explain briefly (under 300 words) why the correct answer is correct, and if relevant, why the student's "
        "answer was wrong. Be encouraging and clear, not harsh."
    )
    user_prompt = (
        f"Question: {question}\nStudent's answer: {user_answer}\nCorrect answer: {correct_answer}\n\n"
        "Explain why the correct answer is right."
    )
    return groq_request(system_prompt, user_prompt, api_key, 400, 0.4)


def api_key_from(_payload):
    return os.getenv("GROQ_API_KEY", "").strip()


class Handler(BaseHTTPRequestHandler):
    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            return json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            return {}

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/progress":
            progress = load_progress()
            self.send_json({"progress": progress, "has_api_key": bool(os.getenv("GROQ_API_KEY"))})
            return
        if path in ("/", "/index.html"):
            try:
                body = INDEX_FILE.read_bytes()
            except OSError:
                self.send_error(500, "index.html not found")
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_error(404)

    def do_POST(self):
        path = urlparse(self.path).path
        payload = self.read_json()
        try:
            if path == "/api/progress/reading":
                passage = READING_PASSAGES[0]
                answers = payload.get("answers", [])
                correct = sum(
                    1 for i, question in enumerate(passage["questions"])
                    if i < len(answers) and answers[i] == question["answer"]
                )
                total = len(passage["questions"])
                progress = load_progress()
                progress["reading"].append({
                    "timestamp": datetime.now().isoformat(timespec="seconds"),
                    "passage_id": passage["id"],
                    "score": correct,
                    "total": total,
                })
                save_progress(progress)
                self.send_json({"score": correct, "total": total, "progress": progress})
                return

            if path == "/api/writing-feedback":
                essay = str(payload.get("essay", "")).strip()
                prompt = str(payload.get("prompt", WRITING_PROMPTS[0]))
                if not essay:
                    self.send_json({"error": "Write something first."}, 400)
                    return
                key = api_key_from(payload)
                result = None
                if key:
                    try:
                        ai_result = ai_writing_feedback(essay, prompt, key)
                        result = {
                            "source": "ai",
                            "band_estimate": ai_result["band_estimate"],
                            "criterion_bands": {
                                "task_achievement_band": ai_result.get("task_achievement_band"),
                                "coherence_cohesion_band": ai_result.get("coherence_cohesion_band"),
                                "lexical_resource_band": ai_result.get("lexical_resource_band"),
                                "grammar_band": ai_result.get("grammar_band"),
                            },
                            "criteria_sentences": [
                                ["Task Achievement", ai_result.get("task_achievement", "")],
                                ["Coherence & Cohesion", ai_result.get("coherence_cohesion", "")],
                                ["Lexical Resource", ai_result.get("lexical_resource", "")],
                                ["Grammar", ai_result.get("grammar", "")],
                            ],
                            "overall_tip": ai_result.get("overall_tip", ""),
                        }
                    except (requests.RequestException, json.JSONDecodeError, KeyError, TypeError, RuntimeError) as error:
                        result = {"fallback_error": str(error)}

                if result is None or "fallback_error" in result:
                    heuristic = heuristic_writing_feedback(essay)
                    result = {
                        "source": "heuristic",
                        "band_estimate": heuristic["band_estimate"],
                        "criterion_bands": None,
                        "criteria_sentences": [
                            ["Word count", f"{heuristic['word_count']} words ({heuristic['sentence_count']} sentences)"],
                            ["Heuristic notes", " · ".join(heuristic["notes"])],
                        ],
                        "overall_tip": "Heuristic is rough — server AI grading provides full IELTS-criteria feedback.",
                        "fallback_error": result.get("fallback_error") if result else None,
                    }

                progress = load_progress()
                entry = {
                    "timestamp": datetime.now().isoformat(timespec="seconds"),
                    "band_estimate": result["band_estimate"],
                    "source": result["source"],
                }
                if result.get("criterion_bands"):
                    entry.update(result["criterion_bands"])
                progress["writing"].append(entry)
                save_progress(progress)
                result["progress"] = progress
                self.send_json(result)
                return

            if path == "/api/explain":
                key = api_key_from(payload)
                if not key:
                    self.send_json({"error": "AI tutor is not configured on the server."}, 503)
                    return
                if not str(payload.get("question", "")).strip() or not str(payload.get("correct_answer", "")).strip():
                    self.send_json({"error": "Fill in at least the question and the correct answer."}, 400)
                    return
                self.send_json({"explanation": explain_answer(
                    payload["question"], payload.get("user_answer", ""), payload["correct_answer"], key
                )})
                return

            if path == "/api/progress/clear":
                save_progress(default_progress())
                self.send_json({"progress": default_progress()})
                return
        except RuntimeError as error:
            self.send_json({"error": str(error)}, 503)
            return
        except requests.RequestException as error:
            self.send_json({"error": f"Network error: {error}"}, 502)
            return
        except (json.JSONDecodeError, KeyError, TypeError, ValueError) as error:
            self.send_json({"error": str(error)}, 400)
            return
        self.send_error(404)

    def log_message(self, _format, *_args):
        return


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"IELTS Practice running at http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()
