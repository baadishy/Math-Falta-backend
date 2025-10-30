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
        let { title, username, grade, email, quizzes, totalScore, parentNumber } = user;
        return { title, username, grade, email, quizzes, totalScore, parentNumber };
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
