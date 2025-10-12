const express = require("express");
require('dotenv').config();
const bodyParser = require("body-parser");
const webpush = require("web-push");
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc } = require("firebase/firestore");
const cors = require("cors");
const app = express();

const allowedOrigins = [
  "http://localhost:3000",    
  "https://awp-orcin.vercel.app"  
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `El origen ${origin} no está permitido por CORS`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: true
}));

app.options(/.*/, cors());

app.use(bodyParser.json());

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

app.post("/api/task", async (req, res) => {
  try {
    const { text, date } = req.body;
    await addDoc(collection(db, "tasks"), { text, date });
    res.status(200).send({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false });
  }
});

// ======== WEB PUSH ========
webpush.setVapidDetails(
  'mailto:tuemail@ejemplo.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

let subscriptions = [];

// Ruta para registrar suscripciones desde el front
app.post("/api/subscribe", (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  console.log("Nueva suscripción:", subscription);
  res.status(201).json({ message: "Suscripción registrada" });
});

// Ruta para enviar notificaciones de prueba
app.post("/api/notify", async (req, res) => {
  const payload = JSON.stringify({
    title: "Hola! Tienes una notificación.",
    body: "Da click para abrir la app.",
    url: "/"
  });

  const sendPromises = subscriptions.map(sub =>
    webpush.sendNotification(sub, payload).catch(err => console.error(err))
  );

  await Promise.all(sendPromises);
  res.json({ message: "Notificaciones enviadas" });
});

app.get("/api/vapid-public-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});


app.listen(3001, () => console.log("Servidor corriendo en http://localhost:3001"));
