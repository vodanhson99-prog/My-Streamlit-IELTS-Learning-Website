import { PracticeTest } from "./ielts"

export const FALLBACK_PRACTICE_TESTS: PracticeTest[] = [
  {
    id: "iot-listening-2025-jan-1",
    slug: "january-listening-practice-test-1-2025",
    title: "January Listening Practice Test 1 (2025)",
    skill: "listening",
    durationMinutes: 30,
    sourceUrl: "https://ieltsonlinetests.com/ielts-mock-test-2025-january-listening-practice-test-1",
    sections: [
      {
        id: "p1",
        title: "Part 1 - Homestay Application",
        instructions: "Complete the form with NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
        audioUrl: "https://ieltsonlinetests.oss-ap-southeast-1.aliyuncs.com/Audio/IELTS_Practice_Test/9/Practice%20test%201.mp3",
        questions: [
          { id: "l-q1", number: 1, type: "fill_in_blank", prompt: "First name:", answer: "Keiko" },
          { id: "l-q2", number: 2, type: "fill_in_blank", prompt: "Passport number:", answer: "JO6337" },
          { id: "l-q3", number: 3, type: "fill_in_blank", prompt: "Course enrolled:", answer: "Advanced English" },
          { id: "l-q4", number: 4, type: "fill_in_blank", prompt: "Length of the course:", answer: "5 months" },
          { id: "l-q5", number: 5, type: "fill_in_blank", prompt: "Homestay time:", answer: "approx 1 month" },
        ],
      },
      {
        id: "p2",
        title: "Part 2 - Travel to Enzia",
        instructions: "Complete the notes with NO MORE THAN THREE WORDS AND/OR NUMBER.",
        audioUrl: "https://ieltsonlinetests.oss-ap-southeast-1.aliyuncs.com/Audio/IELTS_Practice_Test/9/Practice%20test%201.mp3",
        questions: [
          { id: "l-q11", number: 11, type: "fill_in_blank", prompt: "Normal visas last:", answer: "30 days" },
          { id: "l-q12", number: 12, type: "fill_in_blank", prompt: "Cost for the visa:", answer: "$50" },
        ],
      },
    ],
  },
  {
    id: "iot-reading-2025-urban-bees",
    slug: "urban-beekeeping-ecosystems",
    title: "Urban Beekeeping & Ecosystems",
    skill: "reading",
    durationMinutes: 60,
    sourceUrl: "https://ieltsonlinetests.com/ielts-mock-test-2025-reading-practice-test-1",
    sections: [
      {
        id: "r-p1",
        title: "Passage 1 - The Rise of Urban Beekeeping",
        instructions: "Choose the correct letter, A, B, C or D.",
        passageText:
          "Over the past decade, city dwellers across the world have taken up beekeeping as a hobby and, increasingly, as a small business. Rooftops in cities such as London, New York and Tokyo now host thousands of hives. Proponents argue that urban bees are often healthier than their rural counterparts, since cities tend to have a greater diversity of flowering plants and lower pesticide use than industrial farmland. Critics, however, warn that packing too many hives into a small area can lead to competition for nectar, potentially harming wild pollinator populations that were already under pressure.",
        questions: [
          {
            id: "r-q1",
            number: 1,
            type: "single_choice",
            prompt: "According to the passage, why might urban bees be healthier than rural bees?",
            options: [
              "Cities have fewer flowering plants",
              "Cities often have lower pesticide use and more plant diversity",
              "Urban beekeepers use more medication",
              "Rural areas have more predators",
            ],
            answer: 1,
          },
          {
            id: "r-q2",
            number: 2,
            type: "single_choice",
            prompt: "What concern do critics raise about urban beekeeping?",
            options: [
              "It is too expensive",
              "It requires too much space",
              "Too many hives may compete with wild pollinators",
              "Honey quality is lower in cities",
            ],
            answer: 2,
          },
        ],
      },
    ],
  },
  {
    id: "iot-writing-2025-task-pack",
    slug: "ielts-practice-writing-task-1-task-2",
    title: "IELTS Practice Writing Task 1 & Task 2",
    skill: "writing",
    durationMinutes: 60,
    sourceUrl: "https://ieltsonlinetests.com/ielts-mock-test-2025-writing-practice-test-1",
    sections: [],
    writingTasks: {
      task1Prompt:
        "The chart below shows the percentage of households with internet access in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features.",
      task2Prompt:
        "Some people believe that unpaid community service should be a compulsory part of high school education. To what extent do you agree or disagree?",
      task1MinWords: 150,
      task2MinWords: 250,
    },
  },
]
