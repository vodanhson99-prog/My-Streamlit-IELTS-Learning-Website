import { readFile } from "node:fs/promises"

async function verifyLive() {
  await readFile("credential/cookies.json", "utf8")

  const catRes = await fetch("http://localhost:3000/api/practice-catalog")
  console.log("Catalog API status:", catRes.status)
  const catData = await catRes.json()
  console.log("Catalog source:", catData.source, "Total tests:", catData.tests?.length)

  const listeningTest = catData.tests.find((t) => t.skill === "listening" && t.upstreamQuizId)
  const readingTest = catData.tests.find((t) => t.skill === "reading" && t.upstreamQuizId)

  if (listeningTest) {
    const params = new URLSearchParams({ skill: "listening", sourceUrl: listeningTest.sourceUrl })
    const res = await fetch(`http://localhost:3000/api/practice-tests/${listeningTest.upstreamQuizId}?${params}`)
    console.log("\nListening detail status:", res.status)
    const data = await res.json()
    const allQ = data.test?.sections?.flatMap((s) => s.questions) || []
    console.log("Listening total questions:", allQ.length)
    console.log("Listening Q1:", allQ[0])
    console.log("Listening Q2:", allQ[1])
    console.log("Listening Q31:", allQ.find((q) => q.number === 31))
  }

  if (readingTest) {
    const params = new URLSearchParams({ skill: "reading", sourceUrl: readingTest.sourceUrl })
    const res = await fetch(`http://localhost:3000/api/practice-tests/${readingTest.upstreamQuizId}?${params}`)
    console.log("\nReading detail status:", res.status)
    const data = await res.json()
    const allQ = data.test?.sections?.flatMap((s) => s.questions) || []
    console.log("Reading total questions:", allQ.length)
    console.log("Reading Q1:", allQ[0])
    console.log("Reading Q5:", allQ.find((q) => q.number === 5))
  }
}

verifyLive().catch(console.error)
