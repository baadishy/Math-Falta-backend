const express = require("express");
const app = express();
const file = require("fs").promises;
const cors = require("cors");
const { readFile } = require("fs");
const port = process.env.PORT || 3000;
let users = [
  {
    username: "felemonfawzy@admin.com",
    title: "admin",
    password: "theAdminFelemonFawzy",
  },
  {
    title: "student",
    username: "markus mina",
    grade: "10",
    quizzes: [
      {
        topic: "Geometry",
        score: "4",
        doneQuizzes: [
          {
            id: 6,
            grade: 10,
            topic: "Geometry",
            question: "The sum of the interior angles of a pentagon is:",
            options: ["360°", "540°", "720°", "900°"],
            answer: "540°",
            isCorrect: false,
            userAnswer: "720°",
          },
          {
            id: 7,
            grade: 10,
            topic: "Geometry",
            question:
              "Find the area of a triangle with base 12 cm and height 8 cm.",
            options: ["48 cm²", "60 cm²", "72 cm²", "96 cm²"],
            answer: "48 cm²",
            isCorrect: true,
            userAnswer: "48 cm²",
          },
          {
            id: 8,
            grade: 10,
            topic: "Geometry",
            question:
              "A circle has radius 7 cm. Find its circumference (π = 22/7).",
            options: ["22 cm", "44 cm", "66 cm", "77 cm"],
            answer: "44 cm",
            isCorrect: true,
            userAnswer: "44 cm",
          },
          {
            id: 9,
            grade: 10,
            topic: "Geometry",
            question:
              "If two triangles are similar, then their corresponding sides are:",
            options: ["Equal", "Proportional", "Unequal", "Parallel"],
            answer: "Proportional",
            isCorrect: true,
            userAnswer: "Proportional",
          },
          {
            id: 10,
            grade: 10,
            topic: "Geometry",
            question: "The diagonals of a rectangle are always:",
            options: ["Equal", "Perpendicular", "Unequal", "None"],
            answer: "Equal",
            isCorrect: true,
            userAnswer: "Equal",
          },
        ],
      },
      {
        topic: "Algebra",
        score: "1",
        doneQuizzes: [
          {
            id: 1,
            grade: 10,
            topic: "Algebra",
            question: "Simplify: (x + 3)(x - 3)",
            options: ["x² - 9", "x² + 9", "x² + 6x - 9", "x² - 6x + 9"],
            answer: "x² - 9",
            isCorrect: false,
            userAnswer: "x² + 9",
          },
          {
            id: 2,
            grade: 10,
            topic: "Algebra",
            question: "Solve for x: 2x - 5 = 9",
            options: ["x = 2", "x = 5", "x = 7", "x = -7"],
            answer: "x = 7",
            isCorrect: true,
            userAnswer: "x = 7",
          },
          {
            id: 3,
            grade: 10,
            topic: "Algebra",
            question: "If f(x) = 2x + 1, find f(3).",
            options: ["5", "6", "7", "8"],
            answer: "7",
            isCorrect: false,
            userAnswer: "5",
          },
          {
            id: 4,
            grade: 10,
            topic: "Algebra",
            question: "Factorize: x² + 7x + 10",
            options: [
              "(x + 2)(x + 5)",
              "(x + 1)(x + 10)",
              "(x + 3)(x + 4)",
              "(x - 2)(x - 5)",
            ],
            answer: "(x + 2)(x + 5)",
            isCorrect: false,
            userAnswer: "(x + 3)(x + 4)",
          },
          {
            id: 5,
            grade: 10,
            topic: "Algebra",
            question: "Solve for y: 3y + 2 = 11",
            options: ["y = 2", "y = 3", "y = 4", "y = 5"],
            answer: "y = 3",
            isCorrect: false,
            userAnswer: "y = 4",
          },
        ],
      },
      {
        topic: "Trigonometry",
        score: 1,
        doneQuizzes: [
          {
            id: 11,
            grade: 10,
            topic: "Trigonometry",
            question: "sin 30° = ?",
            options: ["1", "1/2", "√3/2", "0"],
            answer: "1/2",
            isCorrect: false,
            userAnswer: "1",
          },
          {
            id: 12,
            grade: 10,
            topic: "Trigonometry",
            question: "cos 60° = ?",
            options: ["1", "0", "1/2", "√3/2"],
            answer: "1/2",
            isCorrect: false,
            userAnswer: "0",
          },
          {
            id: 13,
            grade: 10,
            topic: "Trigonometry",
            question: "tan 45° = ?",
            options: ["0", "1", "√3", "∞"],
            answer: "1",
            isCorrect: true,
            userAnswer: "1",
          },
          {
            id: 14,
            grade: 10,
            topic: "Trigonometry",
            question: "Find the hypotenuse if sin θ = 3/5 and opposite = 6.",
            options: ["8", "9", "10", "12"],
            answer: "10",
            isCorrect: false,
            userAnswer: "9",
          },
          {
            id: 15,
            grade: 10,
            topic: "Trigonometry",
            question: "Which identity is correct?",
            options: [
              "sin²θ + cos²θ = 1",
              "sin²θ - cos²θ = 1",
              "tan²θ + 1 = cos²θ",
              "cot²θ + 1 = sec²θ",
            ],
            answer: "sin²θ + cos²θ = 1",
            isCorrect: false,
            userAnswer: "sin²θ - cos²θ = 1",
          },
        ],
      },
      {
        topic: "Statistics",
        score: 3,
        doneQuizzes: [
          {
            id: 16,
            grade: 10,
            topic: "Statistics",
            question: "The mean of 5, 10, 15 is:",
            options: ["5", "10", "15", "20"],
            answer: "10",
            isCorrect: false,
            userAnswer: "15",
          },
          {
            id: 17,
            grade: 10,
            topic: "Statistics",
            question: "The mode of 2, 3, 3, 5, 7 is:",
            options: ["2", "3", "5", "7"],
            answer: "3",
            isCorrect: false,
            userAnswer: "2",
          },
          {
            id: 18,
            grade: 10,
            topic: "Statistics",
            question: "The probability of getting a head in a coin toss is:",
            options: ["0", "1/2", "1", "2"],
            answer: "1/2",
            isCorrect: true,
            userAnswer: "1/2",
          },
          {
            id: 19,
            grade: 10,
            topic: "Statistics",
            question: "The probability of getting a 6 when rolling a die is:",
            options: ["1/2", "1/3", "1/6", "1/12"],
            answer: "1/6",
            isCorrect: true,
            userAnswer: "1/6",
          },
          {
            id: 20,
            grade: 10,
            topic: "Statistics",
            question: "The median of 3, 7, 9 is:",
            options: ["3", "7", "9", "5"],
            answer: "7",
            isCorrect: true,
            userAnswer: "7",
          },
        ],
      },
    ],
    totalScore: 9,
  },
  {
    title: "student",
    username: "monica mina",
    grade: "6",
    quizzes: [
      {
        topic: "Whole Numbers & Decimals",
        score: 2,
        doneQuizzes: [
          {
            id: 1,
            grade: 6,
            topic: "Whole Numbers & Decimals",
            question: "Write in words: 305.47",
            options: [
              "Three hundred five and forty-seven hundredths",
              "Three hundred fifty-four and seven tenths",
              "Three hundred five thousand forty-seven",
              "Three hundred five point four seven",
            ],
            answer: "Three hundred five and forty-seven hundredths",
            isCorrect: true,
            userAnswer: "Three hundred five and forty-seven hundredths",
          },
          {
            id: 2,
            grade: 6,
            topic: "Whole Numbers & Decimals",
            question: "Round 78.462 to the nearest hundredth.",
            options: ["78.46", "78.47", "78.5", "78"],
            answer: "78.46",
            isCorrect: false,
            userAnswer: "78.5",
          },
          {
            id: 3,
            grade: 6,
            topic: "Whole Numbers & Decimals",
            question: "Convert 4.25 into a fraction in simplest form.",
            options: ["425/100", "17/4", "425/10", "85/20"],
            answer: "17/4",
            isCorrect: false,
            userAnswer: "425/100",
          },
          {
            id: 4,
            grade: 6,
            topic: "Whole Numbers & Decimals",
            question: "Write in Roman numerals: 64",
            options: ["LXIV", "XLIV", "LXV", "LXVI"],
            answer: "LXIV",
            isCorrect: false,
            userAnswer: "LXV",
          },
          {
            id: 5,
            grade: 6,
            topic: "Whole Numbers & Decimals",
            question: "Which is greater: 3.705 or 3.075?",
            options: ["3.705", "3.075", "They are equal", "Cannot be compared"],
            answer: "3.705",
            isCorrect: true,
            userAnswer: "3.705",
          },
        ],
      },
    ],
    totalScore: 2,
  },
];

// async function getUsers(newUser) {
//   let users;
//   try {
//     users = JSON.parse(await file.readFile("./users.json", "utf8"));
//   } catch (err) {
//     console.log(err);
//     users = [
//       {
//         username: "felemonfawzy@admin.com",
//         title: "admin",
//         password: "theAdminFelemonFawzy",
//       },
//     ];
//   } finally {
//     if (newUser) {
//       users.push(newUser);
//       users = users.map((user) => {
//         let { title, username, email, grade } = user;
//         return { title, username, email, grade };
//       });
//     }
//     return users;
//   }
// }
// async function getUsersDetails() {
//   let users;
//   try {
//     users = JSON.parse(await file.readFile("./users.json", "utf8"));
//   } catch (err) {
//     console.log(err);
//     users = [
//       {
//         username: "felemonfawzy@admin.com",
//         title: "admin",
//         password: "theAdminFelemonFawzy",
//       },
//     ];
//   } finally {
//     return users;
//   }
// }
function filterUsers() {
  try {
    console.log(users);
    users.forEach((user) => {
      if (user.quizzes && user.quizzes.length > 0) {
        user.totalScore = user.quizzes.reduce(
          (acc, current) => acc + current.score,
          0
        );
      }
    });
    return users
      .map((user) => {
        let { title, username, grade, email, quizzes, totalScore } = user;
        return { title, username, grade, email, quizzes, totalScore };
      })
      .filter((user) => user.title !== "admin");
  } catch (err) {
    console.log(err);
  }
}
app.use(express.json(), cors());

app.get("/api/users", async (req, res) => {
  // let users = await getUsers();
  res.status(200).json({ success: true, data: filterUsers() });
});

app.post("/api/user/sign-up", async (req, res) => {
  try {
    // let users = await getUsersDetails();
    let newUser = req.body;

    if (
      !users.some(
        (user) =>
          user.username === newUser.username ||
          user.password === newUser.password ||
          user.email === newUser.email
      )
    ) {
      users.push(newUser);
      console.log(users);
      // users = await getUsers(newUser);
      return res.status(201).json({ success: true, data: filterUsers() });
    } else {
      res.status(400).json({
        success: false,
        msg: "username or password or email is already taken",
      });
    }
  } catch (err) {
    return res.status(400).json({ success: false, err: err });
  }
});

app.post("/api/user/sign-in", async (req, res) => {
  try {
    let currentUser = req.body;
    currentUser = users.find(
      (user) =>
        user.username === currentUser.username &&
        user.password === currentUser.password
    );

    if (currentUser) {
      if (currentUser.title === "admin") {
        return res
          .status(200)
          .json({ success: true, url: "nnqgx218wbrlkph.html" });
      }
      return res.status(200).json({ success: true, data: currentUser.id });
    } else {
      res.status(400).json({
        success: false,
        msg: "No user found",
      });
    }
  } catch (err) {
    return res.status(400).json({ success: false, err: err });
  }
});

app.get("/api/user/:id", async (req, res) => {
  try {
    let id = req.params.id;
    let user = users.find((user) => user.id === id);
    if (!user)
      return res.status(401).json({ success: false, msg: "user not found" });
    console.log(user);
    // user = [user].map(user => {
    //   let {title, grade, totalScore, email, username} = user
    //   return {title, grade, totalScore, email, username}
    // })
    user.totalScore = user.quizzes.reduce(
      (acc, current) => acc + current.score,
      0
    );
    let { title, grade, totalScore, email, username, quizzes } = user;
    user = { title, grade, totalScore, email, username, quizzes };
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    return res.status(400).json({ success: false, err: err });
  }
});

app.get("/api/user/details/:id", async (req, res) => {
  try {
    let id = req.params.id;
    let user = users.find((user) => user.id === id);
    if (!user)
      return res.status(401).json({ success: false, msg: "user not found" });

    user.totalScore = user.quizzes.reduce(
      (acc, current) => acc + current.score,
      0
    );
    console.log(user);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    return res.status(400).json({ success: false, err: err });
  }
});

app.put("/api/user/:id/doneQuiz", async (req, res) => {
  try {
    let id = req.params.id;
    let doneQuiz = req.body;

    if (!id) {
      return res
        .status(401)
        .json({ success: false, msg: "no users with same id found" });
    } else if (!doneQuiz) {
      return res.status(401).json({ success: false, msg: "no data sent" });
    }

    let theUser = users.find((user) => user.id === id);
    theUser.quizzes.push(doneQuiz);
    users = users.map((user) => (user.id === id ? theUser : user));
    console.log(theUser.quizzes);
    res.status(201).json({ success: true, data: theUser });
  } catch (err) {
    return res.status(400).json({ success: false, err: err });
  }
});

app.get("/api/quizzes", async (req, res) => {
  try {
    let { grade, topic } = req.query;
    let quizzes = JSON.parse(await file.readFile("./quizzes.json", "utf8"));
    // if (grade) {
    //   if (topic) {
    //   }
    // }
    if (!grade || !topic)
      return res
        .status(400)
        .json({ success: false, msg: "grade or topic missed" });

    quizzes = quizzes
      .find((gradeQuizzes) => gradeQuizzes[0].grade == grade)
      .filter((question) => question.topic === topic);
    res.status(200).json({ success: true, data: quizzes });
  } catch (err) {
    return res.status(400).json({ success: false, err: err });
  }
});

app.get("/api/quizzes/topics", async (req, res) => {
  try {
    let { grade } = req.query;
    let quizzes = JSON.parse(await file.readFile("./quizzes.json", "utf8"));
    if (grade) {
      quizzes = quizzes
        .find((gradeQuizzes) => gradeQuizzes[0].grade == grade)
        .map((question) => question.topic);
      quizzes = [...new Set(quizzes)];
      return res.status(200).json({ success: true, data: quizzes });
    }
    res.status(400).json({ success: false, msg: "no grade found" });
  } catch (err) {
    return res.status(400).json({ success: false, err: err });
  }
});

app.listen(port);
