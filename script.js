
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ======================================
// 1. FIREBASE
// ======================================

const firebaseConfig = {
  apiKey: "AIzaSyA78F7eAKyoviyEGymQ--gcX1bQ4YV9kyY",
  authDomain: "roman-participatif.firebaseapp.com",
  projectId: "roman-participatif",
  storageBucket: "roman-participatif.firebasestorage.app",
  messagingSenderId: "978369308143",
  appId: "1:978369308143:web:35d0d7edf4fceb9b1c821a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let utilisateurActuel = null;
let profilActuel = null;
let chargementTermine = false;
let etapeConnexion = 1;

// ======================================
// 2. OUTILS
// ======================================

function element(id) {
  return document.getElementById(id);
}

function message(id, texte) {
  const zone = element(id);
  if (zone) zone.textContent = texte;
}

function creerElement(tag, classe, texte) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texte !== undefined) el.textContent = texte;
  return el;
}

// ======================================
// 3. NAVIGATION
// ======================================

const pages = [
  "accueil",
  "chapitres",
  "publication",
  "communaute",
  "compte"
];

function afficherPage(nomPage) {
  if (!pages.includes(nomPage)) return;

  // Les pages réservées aux membres sont protégées.
  const pagesProtegees = [
    "chapitres",
    "publication",
    "communaute"
  ];

  if (!utilisateurActuel && pagesProtegees.includes(nomPage)) {
    nomPage = "compte";
    message("messageConnexion", "Connecte-toi pour accéder à cet espace.");
  }

  pages.forEach((id) => {
    const page = element(id);
    if (page) page.hidden = id !== nomPage;
  });

  document.querySelectorAll(".nav-item").forEach((bouton) => {
    const actif = bouton.dataset.page === nomPage;
    bouton.classList.toggle("active", actif);

    if (actif) bouton.setAttribute("aria-current", "page");
    else bouton.removeAttribute("aria-current");
  });

  if (nomPage === "chapitres") {
    afficherChapitres();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach((bouton) => {
  bouton.addEventListener("click", () => {
    afficherPage(bouton.dataset.page);
  });
});

// ======================================
// 4. AFFICHAGE DES FORMULAIRES
// ======================================

function afficherConnexion() {
  element("zoneConnexion").hidden = false;
  element("zoneInscription").hidden = true;
  element("zoneMembre").hidden = true;

  element("zoneMotDePasse").hidden = true;
  element("motDePasseConnexion").required = false;
  element("boutonSuivant")?.remove();

  const bouton = element("formConnexion")?.querySelector(
    'button[type="submit"]'
  );

  if (bouton) bouton.textContent = "Suivant";

  etapeConnexion = 1;
}

element("boutonAfficherInscription")?.addEventListener("click", () => {
  element("zoneConnexion").hidden = true;
  element("zoneInscription").hidden = false;
  message("messageInscription", "");
});

element("boutonRetourConnexion")?.addEventListener("click", () => {
  afficherConnexion();
});

// ======================================
// 5. INSCRIPTION
// ======================================

element("formInscription")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const pseudo = element("pseudo").value.trim();
  const email = element("emailInscription").value.trim();
  const motDePasse = element("motDePasseInscription").value;

  if (pseudo.length < 3 || pseudo.length > 30) {
    message("messageInscription", "Le pseudonyme doit contenir entre 3 et 30 caractères.");
    return;
  }

  try {
    const resultat = await createUserWithEmailAndPassword(
      auth,
      email,
      motDePasse
    );

    await setDoc(doc(db, "users", resultat.user.uid), {
      username: pseudo,
      email: email,
      anonymous: false,
      createdAt: serverTimestamp()
    });

    message("messageInscription", "Compte créé avec succès !");

    // Le changement d'état Firebase enverra le membre à l'accueil.

  } catch (erreur) {
    console.error(erreur);
    message("messageInscription", "Erreur : " + erreur.message);
  }
});

// ======================================
// 6. CONNEXION EN DEUX ÉTAPES
// ======================================

element("formConnexion")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = element("emailConnexion").value.trim();
  const motDePasse = element("motDePasseConnexion");

  if (etapeConnexion === 1) {
    if (!email) {
      message("messageConnexion", "Entre ton adresse e-mail.");
      return;
    }

    element("zoneMotDePasse").hidden = false;
    motDePasse.required = true;

    const bouton = element("formConnexion").querySelector(
      'button[type="submit"]'
    );

    if (bouton) bouton.textContent = "Se connecter";

    etapeConnexion = 2;
    motDePasse.focus();
    message("messageConnexion", "");
    return;
  }

  try {
    await signInWithEmailAndPassword(
      auth,
      email,
      motDePasse.value
    );

    // onAuthStateChanged dirige automatiquement vers Accueil.

  } catch (erreur) {
    console.error(erreur);
    message("messageConnexion", "Adresse e-mail ou mot de passe incorrect.");
  }
});

// ======================================
// 7. MOT DE PASSE OUBLIÉ
// ======================================

element("boutonOublie")?.addEventListener("click", async () => {
  const email = element("emailConnexion").value.trim();

  if (!email) {
    message("messageConnexion", "Entre ton adresse e-mail d'abord.");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    message("messageConnexion", "Un lien de réinitialisation a été envoyé par e-mail.");
  } catch (erreur) {
    console.error(erreur);
    message("messageConnexion", "Impossible d'envoyer le lien. Vérifie ton adresse.");
  }
});

// ======================================
// 8. ÉTAT DE CONNEXION
// ======================================

onAuthStateChanged(auth, async (user) => {
  utilisateurActuel = user;
  profilActuel = null;

  if (user) {
    try {
      const profil = await getDoc(doc(db, "users", user.uid));

      if (profil.exists()) {
        profilActuel = profil.data();
      } else {
        console.error("Profil utilisateur introuvable dans Firestore.");
      }

    } catch (erreur) {
      console.error("Erreur de chargement du profil :", erreur);
    }

    element("zoneConnexion").hidden = true;
    element("zoneInscription").hidden = true;
    element("zoneMembre").hidden = false;

    element("nomMembre").textContent =
      "Connecté sous le pseudonyme : " +
      (profilActuel?.username || "Membre");

    // CONNEXION RÉUSSIE : DIRECTION AUTOMATIQUE À L'ACCUEIL
    afficherPage("accueil");

    // Recharge les chapitres pour le membre connecté.
    await afficherChapitres();

  } else {
    element("zoneMembre").hidden = true;
    afficherConnexion();

    // DÉCONNEXION : RETOUR À L'ÉCRAN DE CONNEXION
    afficherPage("compte");

    // Ne laisse pas les anciennes publications visibles.
    const liste = element("listeChapitres");
    if (liste) {
      liste.replaceChildren(
        creerElement("p", "", "Connecte-toi pour lire les chapitres.")
      );
    }
  }

  chargementTermine = true;
});

// ======================================
// 9. DÉCONNEXION
// ======================================

element("boutonDeconnexion")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    message("messageConnexion", "Tu es déconnecté.");
  } catch (erreur) {
    console.error(erreur);
    alert("La déconnexion a échoué.");
  }
});

// ======================================
// 10. PUBLIER UN CHAPITRE
// ======================================

element("formChapitre")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!utilisateurActuel || !profilActuel) {
    message("messageChapitre", "Connecte-toi avant de publier.");
    afficherPage("compte");
    return;
  }

  const titre = element("titreChapitre").value.trim();
  const contenu = element("texteChapitre").value.trim();
  const anonyme = element("modeAnonyme").checked;

  if (titre.length < 2 || contenu.length < 10) {
    message("messageChapitre", "Ajoute un titre et un texte d'au moins 10 caractères.");
    return;
  }

  try {
    await addDoc(collection(db, "chapters"), {
      title: titre,
      content: contenu,
      authorId: utilisateurActuel.uid,
      authorName: anonyme ? "Auteur anonyme" : profilActuel.username,
      anonymous: anonyme,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    message("messageChapitre", "Ton chapitre a été publié avec succès !");
    e.target.reset();

    await afficherChapitres();
    afficherPage("chapitres");

  } catch (erreur) {
    console.error("Erreur de publication :", erreur);
    message("messageChapitre", "Publication impossible. Vérifie les règles Firestore.");
  }
});

// ======================================
// 11. AFFICHER LES CHAPITRES
// ======================================

async function afficherChapitres() {
  const liste = element("listeChapitres");
  if (!liste) return;

  if (!utilisateurActuel) {
    liste.replaceChildren(
      creerElement("p", "", "Connecte-toi pour lire les chapitres.")
    );
    return;
  }

  liste.replaceChildren(
    creerElement("p", "", "Chargement des chapitres...")
  );

  try {
    const resultat = await getDocs(collection(db, "chapters"));

    const chapitres = resultat.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));

    chapitres.sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || 0;
      const dateB = b.createdAt?.toMillis?.() || 0;
      return dateB - dateA;
    });

    liste.replaceChildren();

    if (chapitres.length === 0) {
      liste.appendChild(
        creerElement("p", "", "Aucun chapitre publié pour le moment.")
      );
      return;
    }

    for (const chapitre of chapitres) {
      const carte = creerElement("article", "chapitre");

      carte.appendChild(
        creerElement("h3", "", chapitre.title || "Sans titre")
      );

      carte.appendChild(
        creerElement(
          "p",
          "auteur",
          "Publié par : " + (chapitre.authorName || "Auteur anonyme")
        )
      );

      carte.appendChild(
        creerElement("div", "contenu-chapitre", chapitre.content || "")
      );

      // LIKES
      const actions = creerElement("div", "actions-chapitre");
      const boutonLike = creerElement("button", "", "♡ J'aime");
      boutonLike.type = "button";

      const likeRef = doc(
        db,
        "chapters",
        chapitre.id,
        "likes",
        utilisateurActuel.uid
      );

      const likeExiste = await getDoc(likeRef);

      if (likeExiste.exists()) {
        boutonLike.textContent = "♥ J'aime";
      }

      boutonLike.addEventListener("click", async () => {
        if (!utilisateurActuel) return;

        try {
          const verification = await getDoc(likeRef);

          if (verification.exists()) {
            await deleteDoc(likeRef);
          } else {
            await setDoc(likeRef, {
              userId: utilisateurActuel.uid,
              createdAt: serverTimestamp()
            });
          }

          await afficherChapitres();

        } catch (erreur) {
          console.error(erreur);
          alert("Impossible d'enregistrer ton appréciation.");
        }
      });

      actions.appendChild(boutonLike);

      const likes = await getDocs(
        collection(db, "chapters", chapitre.id, "likes")
      );

      actions.appendChild(
        creerElement("span", "", likes.size + " appréciation(s)")
      );

      carte.appendChild(actions);

      // MODIFIER / SUPPRIMER SON PROPRE CHAPITRE
      if (utilisateurActuel.uid === chapitre.authorId) {
        const boutonModifier = creerElement("button", "", "Modifier");
        boutonModifier.type = "button";

        boutonModifier.addEventListener("click", async () => {
          const nouveauTitre = prompt("Nouveau titre :", chapitre.title);
          if (nouveauTitre === null) return;

          const nouveauTexte = prompt("Nouveau texte :", chapitre.content);
          if (nouveauTexte === null) return;

          if (!nouveauTitre.trim() || nouveauTexte.trim().length < 10) {
            alert("Le titre et le texte sont obligatoires.");
            return;
          }

          try {
            await updateDoc(doc(db, "chapters", chapitre.id), {
              title: nouveauTitre.trim(),
              content: nouveauTexte.trim(),
              updatedAt: serverTimestamp()
            });

            await afficherChapitres();
          } catch (erreur) {
            console.error(erreur);
            alert("Modification impossible.");
          }
        });

        const boutonSupprimer = creerElement("button", "", "Supprimer");
        boutonSupprimer.type = "button";

        boutonSupprimer.addEventListener("click", async () => {
          if (!confirm("Veux-tu vraiment supprimer ce chapitre ?")) return;

          try {
            await deleteDoc(doc(db, "chapters", chapitre.id));
            await afficherChapitres();
          } catch (erreur) {
            console.error(erreur);
            alert("Suppression impossible.");
          }
        });

        carte.appendChild(boutonModifier);
        carte.appendChild(boutonSupprimer);
      }

      // COMMENTAIRES
      const zoneCommentaires = creerElement("div", "commentaires");
      zoneCommentaires.appendChild(
        creerElement("h4", "", "Commentaires")
      );

      const resultatCommentaires = await getDocs(
        collection(db, "chapters", chapitre.id, "comments")
      );

      const commentaires = resultatCommentaires.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      for (const commentaire of commentaires) {
        const bloc = creerElement("div", "commentaire");

        bloc.appendChild(
          creerElement("strong", "", commentaire.authorName || "Membre")
        );

        bloc.appendChild(
          creerElement("p", "", commentaire.text || "")
        );

        // RÉPONSES
        const resultatReponses = await getDocs(
          collection(
            db,
            "chapters",
            chapitre.id,
            "comments",
            commentaire.id,
            "replies"
          )
        );

        resultatReponses.forEach((reponseDoc) => {
          const reponse = reponseDoc.data();
          const blocReponse = creerElement("div", "reponse");

          blocReponse.appendChild(
            creerElement("strong", "", reponse.authorName || "Membre")
          );

          blocReponse.appendChild(
            creerElement("p", "", reponse.text || "")
          );

          bloc.appendChild(blocReponse);
        });

        // FORMULAIRE DE RÉPONSE
        const formulaireReponse = document.createElement("form");
        const champReponse = document.createElement("textarea");
        champReponse.placeholder = "Écrire une réponse...";
        champReponse.required = true;

        const boutonReponse = creerElement("button", "", "Répondre");
        boutonReponse.type = "submit";

        formulaireReponse.appendChild(champReponse);
        formulaireReponse.appendChild(boutonReponse);

        formulaireReponse.addEventListener("submit", async (e) => {
          e.preventDefault();

          if (!utilisateurActuel || !profilActuel) return;

          const texte = champReponse.value.trim();
          if (!texte) return;

          try {
            await addDoc(
              collection(
                db,
                "chapters",
                chapitre.id,
                "comments",
                commentaire.id,
                "replies"
              ),
              {
                text: texte,
                authorId: utilisateurActuel.uid,
                authorName: profilActuel.username,
                createdAt: serverTimestamp()
              }
            );

            await afficherChapitres();

          } catch (erreur) {
            console.error(erreur);
            alert("Impossible d'envoyer la réponse.");
          }
        });

        bloc.appendChild(formulaireReponse);
        zoneCommentaires.appendChild(bloc);
      }

      // AJOUTER UN COMMENTAIRE
      const formulaireCommentaire = document.createElement("form");
      const champCommentaire = document.createElement("textarea");

      champCommentaire.placeholder = "Écrire un commentaire...";
      champCommentaire.required = true;

      const boutonCommentaire = creerElement(
        "button",
        "",
        "Envoyer le commentaire"
      );
      boutonCommentaire.type = "submit";

      formulaireCommentaire.appendChild(champCommentaire);
      formulaireCommentaire.appendChild(boutonCommentaire);

      formulaireCommentaire.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!utilisateurActuel || !profilActuel) return;

        const texte = champCommentaire.value.trim();
        if (!texte) return;

        try {
          await addDoc(
            collection(db, "chapters", chapitre.id, "comments"),
            {
              text: texte,
              authorId: utilisateurActuel.uid,
              authorName: profilActuel.username,
              createdAt: serverTimestamp()
            }
          );

          await afficherChapitres();

        } catch (erreur) {
          console.error(erreur);
          alert("Impossible d'envoyer le commentaire.");
        }
      });

      zoneCommentaires.appendChild(formulaireCommentaire);
      carte.appendChild(zoneCommentaires);
      liste.appendChild(carte);
    }

  } catch (erreur) {
    console.error("Erreur de chargement des chapitres :", erreur);

    liste.replaceChildren(
      creerElement(
        "p",
        "",
        "Impossible de charger les chapitres. Vérifie les règles Firestore."
      )
    );
  }
}

// ======================================
// 12. DÉMARRAGE
// ======================================

// On attend que Firebase confirme l'état de connexion.
// onAuthStateChanged choisira ensuite automatiquement la bonne page.

console.log("Roman Participatif : application prête.");
