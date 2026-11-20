
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
  query,
  where,
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
let romanActuel = null;
let chapitreEnEdition = null;

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
  "romans",
  "editeurRoman",
  "editeurChapitre",
  "notifications",
  "chapitres",
  "publication",
  "communaute",
  "compte"
];

function afficherPage(nomPage) {
  if (!pages.includes(nomPage)) return;

  // Les pages réservées aux membres sont protégées.
  const pagesProtegees = [
    "romans",
    "editeurChapitre",
    "notifications",
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

  if (nomPage === "chapitres") afficherChapitres();
  if (nomPage === "romans") afficherRomans();
  if (nomPage === "editeurRoman" && romanActuel) afficherChapitresRoman();
  if (nomPage === "notifications") afficherNotifications();

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
        // Répare automatiquement les comptes Auth sans profil Firestore.
        const pseudoParDefaut =
          user.displayName ||
          (user.email ? user.email.split("@")[0] : "") ||
          ("Membre-" + user.uid.slice(0, 6));

        const nouveauProfil = {
          username: pseudoParDefaut,
          email: user.email || "",
          anonymous: false,
          createdAt: serverTimestamp()
        };

        await setDoc(doc(db, "users", user.uid), nouveauProfil);
        profilActuel = nouveauProfil;
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

    // Recharge les chapitres et les notifications du membre connecté.
    await afficherChapitres();
    await actualiserCompteurNotifications();

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
            await creerNotification(chapitre.authorId, "like", (profilActuel?.username || "Un membre") + " a apprécié ton chapitre « " + (chapitre.title || "Sans titre") + " ».", chapitre.id);
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
          await creerNotification(chapitre.authorId, "comment", (profilActuel.username || "Un membre") + " a commenté ton chapitre « " + (chapitre.title || "Sans titre") + " ».", chapitre.id);

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
// ======================================
// 12. AFFICHER LES ROMANS
// ======================================

async function afficherRomans() {
  const liste = element("listeRomans");
  if (!liste) return;

  if (!utilisateurActuel) {
    liste.textContent = "Connecte-toi pour voir les romans.";
    return;
  }

  liste.textContent = "Chargement des romans...";

  try {
    const romansPublies = await getDocs(
      query(
        collection(db, "novels"),
        where("status", "==", "Published")
      )
    );

    const mesRomans = await getDocs(
      query(
        collection(db, "novels"),
        where("authorId", "==", utilisateurActuel.uid)
      )
    );

    const romans = new Map();

    romansPublies.forEach((document) => {
      romans.set(document.id, { id: document.id, ...document.data() });
    });

    mesRomans.forEach((document) => {
      romans.set(document.id, { id: document.id, ...document.data() });
    });

    liste.replaceChildren();

    if (romans.size === 0) {
      liste.textContent = "Aucun roman pour le moment.";
      return;
    }

    romans.forEach((roman, id) => {
      const carte = document.createElement("article");
      carte.className = "carte-roman";
      const titre = document.createElement("h3");
      const description = document.createElement("p");
      const boutonOuvrir = document.createElement("button");

      titre.textContent = roman.title || "Roman sans titre";
      description.textContent = roman.description || "Aucune description.";
      boutonOuvrir.type = "button";
      boutonOuvrir.className = "primary-btn";
      boutonOuvrir.textContent = "Ouvrir et écrire";
      boutonOuvrir.addEventListener("click", () => ouvrirRoman(id, roman));

      carte.append(titre, description, boutonOuvrir);
      liste.appendChild(carte);
    });

  } catch (erreur) {
    console.error("Erreur de chargement des romans :", erreur);
    liste.textContent = "Impossible de charger les romans.";
  }
}

// ======================================
// 13. CRÉER UN ROMAN
// ======================================

element("boutonCreerRoman")?.addEventListener("click", async () => {
  if (!utilisateurActuel || !profilActuel) {
    alert("Connecte-toi pour créer un roman.");
    afficherPage("compte");
    return;
  }

  const titre = prompt("Quel est le titre de ton roman ?");
  if (titre === null) return;

  if (titre.trim().length < 2) {
    alert("Le titre doit contenir au moins 2 caractères.");
    return;
  }

  const description = prompt("Ajoute une courte description (facultatif) :") || "";

  try {
    await addDoc(collection(db, "novels"), {
      title: titre.trim(),
      description: description.trim(),
      coverUrl: "",
      authorId: utilisateurActuel.uid,
      authorName: profilActuel.username || "Auteur",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: "Draft"
    });

    alert("Ton roman a été créé dans ta bibliothèque !");
    await afficherRomans();
  } catch (erreur) {
    console.error("Erreur de création du roman :", erreur);
    alert("Impossible de créer le roman. Vérifie les règles Firestore.");
  }
});



// ======================================
// 14. OUVRIR UN ROMAN ET ÉCRIRE SES CHAPITRES
// ======================================

function ouvrirRoman(romanId, roman) {
  romanActuel = { id: romanId, ...roman };

  element("titreRomanOuvert").textContent = roman.title || "Mon roman";
  element("descriptionRomanOuvert").textContent = roman.description || "";
  element("formNouveauChapitre").reset();
  message("messageNouveauChapitre", "");
  afficherPage("editeurRoman");
}

element("boutonNotifications")?.addEventListener("click", () => afficherPage("notifications"));
element("navNotifications")?.addEventListener("click", () => afficherPage("notifications"));

async function creerNotification(destinataireId, type, texte, chapitreId) {
  if (!destinataireId || destinataireId === utilisateurActuel?.uid) return;
  try {
    await addDoc(collection(db, "notifications"), {
      recipientId: destinataireId,
      actorId: utilisateurActuel.uid,
      actorName: profilActuel?.username || "Un membre",
      type,
      text: texte,
      chapterId: chapitreId || "",
      read: false,
      createdAt: serverTimestamp()
    });
    await actualiserCompteurNotifications();
  } catch (erreur) {
    console.error("Notification non enregistrée. Vérifie les règles Firestore :", erreur);
  }
}

async function actualiserCompteurNotifications() {
  if (!utilisateurActuel) return;
  try {
    const resultat = await getDocs(query(collection(db, "notifications"), where("recipientId", "==", utilisateurActuel.uid)));
    const nonLues = resultat.docs.filter(d => d.data().read !== true).length;
    const compteur = element("compteurNotifications");
    if (compteur) compteur.textContent = String(nonLues);
  } catch (erreur) {
    console.warn("Compteur des notifications indisponible :", erreur);
  }
}

async function afficherNotifications() {
  const liste = element("listeNotifications");
  if (!liste || !utilisateurActuel) return;
  liste.textContent = "Chargement des notifications...";
  try {
    const resultat = await getDocs(query(collection(db, "notifications"), where("recipientId", "==", utilisateurActuel.uid)));
    const notifications = resultat.docs.map(d => ({id:d.id,...d.data()}));
    notifications.sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0));
    liste.replaceChildren();
    if (!notifications.length) { liste.textContent = "Tu n'as pas encore de notification."; }
    for (const n of notifications) {
      const carte = creerElement("article", "notification-item" + (n.read ? "" : " unread"));
      carte.appendChild(creerElement("p", "", n.text || "Nouvelle activité"));
      carte.appendChild(creerElement("small", "", n.actorName || "Un membre"));
      if (!n.read) {
        const bouton = creerElement("button", "", "Marquer comme lu");
        bouton.type = "button";
        bouton.addEventListener("click", async () => {
          try { await updateDoc(doc(db, "notifications", n.id), {read:true}); await afficherNotifications(); await actualiserCompteurNotifications(); }
          catch(e) { console.error(e); alert("Impossible de mettre à jour cette notification."); }
        });
        carte.appendChild(bouton);
      }
      liste.appendChild(carte);
    }
    await actualiserCompteurNotifications();
  } catch (erreur) {
    console.error("Erreur de chargement des notifications :", erreur);
    liste.textContent = "Les notifications ne sont pas accessibles. Vérifie les règles Firestore de la collection notifications.";
  }
}

element("retourRomans")?.addEventListener("click", () => {
  afficherPage("romans");
});

element("formNouveauChapitre")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!utilisateurActuel || !profilActuel || !romanActuel) {
    alert("Connecte-toi et ouvre d'abord ton roman.");
    return;
  }

  if (romanActuel.authorId !== utilisateurActuel.uid) {
    alert("Seul l'auteur de ce roman peut y ajouter un chapitre.");
    return;
  }

  const titre = element("titreNouveauChapitre").value.trim();
  const contenu = element("contenuNouveauChapitre").value.trim();
  const anonyme = element("anonymeNouveauChapitre").checked;

  if (titre.length < 2 || contenu.length < 10) {
    message("messageNouveauChapitre", "Le titre doit contenir 2 caractères et le texte au moins 10.");
    return;
  }

  try {
    await addDoc(collection(db, "novels", romanActuel.id, "chapters"), {
      title: titre,
      content: contenu,
      authorId: utilisateurActuel.uid,
      authorName: anonyme ? "Auteur anonyme" : profilActuel.username,
      anonymous: anonyme,
      status: "Draft",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    element("formNouveauChapitre").reset();
    message("messageNouveauChapitre", "Chapitre enregistré dans ce roman !");
    await afficherChapitresRoman();
  } catch (erreur) {
    console.error("Erreur d'enregistrement du chapitre :", erreur);
    message("messageNouveauChapitre", "Enregistrement refusé par Firebase. Les règles des chapitres du roman doivent être ajoutées.");
  }
});

function ouvrirEditeurChapitre(chapitre) {
  chapitreEnEdition = { ...chapitre };
  element("titreEditionChapitre").value = chapitre.title || "";
  element("texteEditionChapitre").value = chapitre.content || "";
  message("messageEditionChapitre", "");
  element("publierEditionChapitre").hidden = chapitre.status === "Published";
  afficherPage("editeurChapitre");
}

async function enregistrerEditionChapitre(publier = false) {
  if (!chapitreEnEdition || !romanActuel || !utilisateurActuel) return;
  const titre = element("titreEditionChapitre").value.trim();
  const contenu = element("texteEditionChapitre").value.trim();
  if (titre.length < 2 || contenu.length < 10) {
    message("messageEditionChapitre", "Le titre doit contenir au moins 2 caractères et le texte au moins 10.");
    return false;
  }
  try {
    await updateDoc(doc(db, "novels", romanActuel.id, "chapters", chapitreEnEdition.id), {
      title: titre,
      content: contenu,
      ...(publier ? {status:"Published", publishedAt:serverTimestamp()} : {}),
      updatedAt: serverTimestamp()
    });
    chapitreEnEdition.title = titre;
    chapitreEnEdition.content = contenu;
    if (publier) chapitreEnEdition.status = "Published";
    message("messageEditionChapitre", publier ? "Chapitre publié avec succès !" : "Corrections enregistrées.");
    await afficherChapitresRoman();
    if (publier) afficherPage("editeurRoman");
    return true;
  } catch (erreur) {
    console.error("Erreur d'enregistrement :", erreur);
    message("messageEditionChapitre", "Enregistrement impossible. Vérifie les règles Firestore.");
    return false;
  }
}

element("formEditionChapitre")?.addEventListener("submit", async e => {
  e.preventDefault();
  await enregistrerEditionChapitre(false);
});
element("publierEditionChapitre")?.addEventListener("click", async () => {
  if (confirm("Publier ce chapitre ? Il sera alors visible dans ton roman.")) await enregistrerEditionChapitre(true);
});
element("retourEditeurRoman")?.addEventListener("click", () => afficherPage("editeurRoman"));
element("annulerEditionChapitre")?.addEventListener("click", () => afficherPage("editeurRoman"));

async function afficherChapitresRoman() {
  const liste = element("listeChapitresRoman");
  if (!liste || !romanActuel) return;

  liste.textContent = "Chargement des chapitres...";
  try {
    const resultat = await getDocs(
      collection(db, "novels", romanActuel.id, "chapters")
    );

    liste.replaceChildren();

    if (resultat.empty) {
      liste.textContent = "Aucun chapitre pour le moment. Écris le premier ci-dessus.";
      return;
    }

    const chapitres = resultat.docs.map(d => ({ id: d.id, ...d.data() }));
    chapitres.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));

    chapitres.forEach((chapitre, index) => {
      const carte = creerElement("article", "chapitre");
      carte.appendChild(creerElement("h3", "", "Chapitre " + (index + 1) + " : " + chapitre.title));
      carte.appendChild(creerElement("p", "auteur", "Par " + (chapitre.authorName || "Auteur anonyme") + (chapitre.status === "Published" ? " · Publié" : " · Brouillon")));
      carte.appendChild(creerElement("div", "contenu-chapitre", chapitre.content || ""));

      // Seul l'auteur peut corriger ou supprimer son chapitre.
      if (utilisateurActuel && utilisateurActuel.uid === chapitre.authorId) {
        const actions = creerElement("div", "actions-chapitre");

        const boutonModifier = creerElement("button", "btn-modifier", "✏️ Modifier");
        boutonModifier.type = "button";
        boutonModifier.addEventListener("click", () => ouvrirEditeurChapitre(chapitre));

        const boutonSupprimer = creerElement("button", "btn-supprimer", "🗑️ Effacer");
        boutonSupprimer.type = "button";
        boutonSupprimer.title = "Supprimer ce chapitre";
        boutonSupprimer.setAttribute("aria-label", "Supprimer ce chapitre");
        boutonSupprimer.addEventListener("click", async () => {
          if (!confirm("Veux-tu vraiment effacer ce chapitre ? Cette action est définitive.")) return;

          boutonSupprimer.disabled = true;
          try {
            await deleteDoc(doc(db, "novels", romanActuel.id, "chapters", chapitre.id));
            await afficherChapitresRoman();
          } catch (erreur) {
            console.error("Erreur de suppression du chapitre :", erreur);
            alert("Impossible d'effacer ce chapitre. Vérifie les règles Firestore.");
          } finally {
            boutonSupprimer.disabled = false;
          }
        });

        if (chapitre.status !== "Published") {
          const boutonPublier = creerElement("button", "btn-publier", "🚀 Publier");
          boutonPublier.type = "button";
          boutonPublier.addEventListener("click", async () => {
            if (!confirm("Publier ce chapitre pour le rendre visible aux lecteurs ?")) return;
            boutonPublier.disabled = true;
            try {
              await updateDoc(doc(db, "novels", romanActuel.id, "chapters", chapitre.id), {status:"Published", publishedAt:serverTimestamp(), updatedAt:serverTimestamp()});
              await afficherChapitresRoman();
            } catch (erreur) {
              console.error("Erreur de publication :", erreur);
              alert("Publication impossible. Vérifie les règles Firestore.");
            } finally { boutonPublier.disabled = false; }
          });
          actions.appendChild(boutonPublier);
        }
        actions.append(boutonModifier, boutonSupprimer);
        carte.appendChild(actions);
      }

      liste.appendChild(carte);
    });
  } catch (erreur) {
    console.error("Erreur de lecture des chapitres du roman :", erreur);
    liste.textContent = "Impossible de charger les chapitres. Les règles Firebase doivent autoriser l'accès à cette sous-collection.";
  }
}
