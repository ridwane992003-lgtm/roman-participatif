
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// CONFIGURATION FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyA78F7eAKyoviyEGymQ--gcX1bQ4YV9kyY",
  authDomain: "roman-participatif.firebaseapp.com",
  projectId: "roman-participatif",
  storageBucket: "roman-participatif.firebasestorage.app",
  messagingSenderId: "978369308143",
  appId: "1:978369308143:web:35d0d7edf4fceb9b1c821a"
};

// INITIALISATION
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// INSCRIPTION
document.getElementById("formInscription")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const pseudo = document.getElementById("pseudo").value.trim();
  const email = document.getElementById("emailInscription").value.trim();
  const motDePasse = document.getElementById("motDePasseInscription").value;
  const message = document.getElementById("messageInscription");

  try {
    if (pseudo.length < 3 || pseudo.length > 30) {
      throw new Error("Le pseudonyme doit contenir entre 3 et 30 caractères.");
    }

    const resultat = await createUserWithEmailAndPassword(auth, email, motDePasse);

    await setDoc(doc(db, "users", resultat.user.uid), {
      username: pseudo,
      email: email,
      anonymous: false,
      createdAt: serverTimestamp()
    });

    message.textContent = "Inscription réussie ! Bienvenue dans le roman participatif.";
    e.target.reset();

  } catch (erreur) {
    message.textContent = "Erreur : " + erreur.message;
  }
});

// CONNEXION
document.getElementById("formConnexion")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("emailConnexion").value.trim();
  const motDePasse = document.getElementById("motDePasseConnexion").value;
  const message = document.getElementById("messageConnexion");

  try {
    await signInWithEmailAndPassword(auth, email, motDePasse);
    message.textContent = "Connexion réussie !";
    e.target.reset();

  } catch (erreur) {
    message.textContent = "Identifiants incorrects ou problème de connexion.";
  }
});

// MOT DE PASSE OUBLIÉ
document.getElementById("boutonOublie")?.addEventListener("click", async () => {
  const email = document.getElementById("emailConnexion").value.trim();
  const message = document.getElementById("messageConnexion");

  if (!email) {
    message.textContent = "Entre ton adresse e-mail avant de demander la réinitialisation.";
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    message.textContent = "Un e-mail de réinitialisation a été envoyé.";

  } catch (erreur) {
    message.textContent = "Impossible d'envoyer l'e-mail. Vérifie ton adresse.";
  }
});

// DÉCONNEXION
document.getElementById("boutonDeconnexion")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    alert("Déconnexion réussie.");

  } catch (erreur) {
    alert("Une erreur est survenue.");
  }
});

// NAVIGATION ENTRE LES MENUS
const pages = [
  "accueil",
  "chapitres",
  "publication",
  "communaute",
  "compte"
];

function afficherPage(nomPage) {
  if (!pages.includes(nomPage)) return;

  pages.forEach((id) => {
    const page = document.getElementById(id);

    if (page) {
      page.hidden = id !== nomPage;
    }
  });

  document.querySelectorAll("[data-page]").forEach((bouton) => {
    const actif = bouton.dataset.page === nomPage;

    if (bouton.classList.contains("nav-item")) {
      bouton.classList.toggle("active", actif);

      if (actif) {
        bouton.setAttribute("aria-current", "page");
      } else {
        bouton.removeAttribute("aria-current");
      }
    }
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// ACTION DES BOUTONS
document.querySelectorAll("[data-page]").forEach((bouton) => {
  bouton.addEventListener("click", () => {
    afficherPage(bouton.dataset.page);
  });
});

// AFFICHER L'ACCUEIL AU DÉMARRAGE
afficherPage("accueil");

console.log("Roman Participatif : application initialisée.");
