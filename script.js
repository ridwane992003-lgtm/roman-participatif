
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

// =====================================
// 1. CONFIGURATION FIREBASE
// =====================================

const firebaseConfig = {
  apiKey: "REMPLACE_PAR_TA_CLE_API",
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

// =====================================
// 2. OUTILS
// =====================================

function element(id) {
  return document.getElementById(id);
}

function afficherMessage(id, message) {
  if (element(id)) {
    element(id).textContent = message;
  }
}

function creerElement(tag, classe, texte) {
  const el = document.createElement(tag);

  if (classe) el.className = classe;
  if (texte !== undefined) el.textContent = texte;

  return el;
}

// =====================================
// 3. INSCRIPTION
// =====================================

element("formInscription")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const pseudo = element("pseudo").value.trim();
  const email = element("emailInscription").value.trim();
  const motDePasse = element("motDePasseInscription").value;

  try {
    if (pseudo.length < 3 || pseudo.length > 30) {
      throw new Error("Le pseudonyme doit contenir entre 3 et 30 caractères.");
    }

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

    afficherMessage(
      "messageInscription",
      "Bienvenue ! Ton inscription est réussie."
    );

    e.target.reset();

  } catch (erreur) {
    console.error(erreur);
    afficherMessage(
      "messageInscription",
      "Erreur : " + erreur.message
    );
  }
});

// =====================================
// 4. CONNEXION
// =====================================

element("formConnexion")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = element("emailConnexion").value.trim();
  const motDePasse = element("motDePasseConnexion").value;

  try {
    await signInWithEmailAndPassword(auth, email, motDePasse);

    afficherMessage("messageConnexion", "Connexion réussie !");
    e.target.reset();

  } catch (erreur) {
    console.error(erreur);
    afficherMessage(
      "messageConnexion",
      "Adresse e-mail ou mot de passe incorrect."
    );
  }
});

// =====================================
// 5. MOT DE PASSE OUBLIÉ
// =====================================

element("boutonOublie")?.addEventListener("click", async () => {
  const email = element("emailConnexion").value.trim();

  if (!email) {
    afficherMessage(
      "messageConnexion",
      "Entre ton adresse e-mail."
    );
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);

    afficherMessage(
      "messageConnexion",
      "Vérifie ta boîte e-mail pour réinitialiser ton mot de passe."
    );

  } catch (erreur) {
    afficherMessage(
      "messageConnexion",
      "Impossible d'envoyer l'e-mail."
    );
  }
});

// =====================================
// 6. ÉTAT DE CONNEXION
// =====================================

onAuthStateChanged(auth, async (user) => {
  utilisateurActuel = user;
  profilActuel = null;

  if (user) {
    try {
      const profil = await getDoc(doc(db, "users", user.uid));

      if (profil.exists()) {
        profilActuel = profil.data();
      }
    } catch (erreur) {
      console.error("Erreur de profil :", erreur);
    }

    element("zoneInscription").hidden = true;
    element("zoneConnexion").hidden = true;
    element("zoneMembre").hidden = false;

    element("nomMembre").textContent =
      "Connecté sous le pseudonyme : " +
      (profilActuel?.username || "Membre");

  } else {
    element("zoneInscription").hidden = false;
    element("zoneConnexion").hidden = false;
    element("zoneMembre").hidden = true;
  }

  afficherChapitres();
});

// =====================================
// 7. DÉCONNEXION
// =====================================

element("boutonDeconnexion")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    alert("Tu es déconnecté.");
  } catch (erreur) {
    alert("Erreur pendant la déconnexion.");
  }
});

// =====================================
// 8. PUBLICATION D'UN CHAPITRE
// =====================================

element("formChapitre")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!utilisateurActuel || !profilActuel) {
    afficherMessage(
      "messageChapitre",
      "Connecte-toi avant de publier."
    );
    return;
  }

  const titre = element("titreChapitre").value.trim();
  const contenu = element("texteChapitre").value.trim();
  const anonyme = element("modeAnonyme").checked;

  if (titre.length < 2 || contenu.length < 10) {
    afficherMessage(
      "messageChapitre",
      "Ajoute un titre et un texte suffisamment long."
    );
    return;
  }

  try {
    await addDoc(collection(db, "chapters"), {
      title: titre,
      content: contenu,
      authorId: utilisateurActuel.uid,
      authorName: anonyme
        ? "Auteur anonyme"
        : profilActuel.username,
      anonymous: anonyme,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    afficherMessage(
      "messageChapitre",
      "Ton chapitre a été publié avec succès !"
    );

    e.target.reset();
    afficherChapitres();

  } catch (erreur) {
    console.error(erreur);
    afficherMessage(
      "messageChapitre",
      "Publication impossible. Vérifie les règles Firestore."
    );
  }
});

// =====================================
// 9. AFFICHER LES CHAPITRES
// =====================================

async function afficherChapitres() {
  const liste = element("listeChapitres");

  if (!liste) return;

  liste.replaceChildren(
    creerElement("p", "", "Chargement des chapitres...")
  );

  try {
    const resultat = await getDocs(collection(db, "chapters"));

    const chapitres = resultat.docs.map(d => ({
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

      const actions = creerElement("div", "actions-chapitre");

      // Bouton J'aime
      const boutonLike = creerElement("button", "", "♡ J'aime");

      if (utilisateurActuel) {
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

            afficherChapitres();

          } catch (erreur) {
            alert("Impossible d'enregistrer ton appréciation.");
            console.error(erreur);
          }
        });

      } else {
        boutonLike.disabled = true;
        boutonLike.textContent = "Connecte-toi pour aimer";
      }

      actions.appendChild(boutonLike);

      // Nombre de likes
      const likes = await getDocs(
        collection(db, "chapters", chapitre.id, "likes")
      );

      actions.appendChild(
        creerElement("span", "", likes.size + " appréciation(s)")
      );

      carte.appendChild(actions);

      // Modification et suppression du propriétaire
      if (
        utilisateurActuel &&
        utilisateurActuel.uid === chapitre.authorId
      ) {
        const boutonModifier = creerElement(
          "button",
          "secondaire",
          "Modifier"
        );

        boutonModifier.addEventListener("click", async () => {
          const nouveauTitre = prompt("Nouveau titre :", chapitre.title);
          if (nouveauTitre === null) return;

          const nouveauTexte = prompt(
            "Nouveau contenu :",
            chapitre.content
          );

          if (nouveauTexte === null) return;

          if (!nouveauTitre.trim() || nouveauTexte.trim().length < 10) {
            alert("Le titre et le contenu sont obligatoires.");
            return;
          }

          try {
            await updateDoc(doc(db, "chapters", chapitre.id), {
              title: nouveauTitre.trim(),
              content: nouveauTexte.trim(),
              updatedAt: serverTimestamp()
            });

            afficherChapitres();

          } catch (erreur) {
            alert("Modification impossible.");
          }
        });

        const boutonSupprimer = creerElement(
          "button",
          "secondaire",
          "Supprimer"
        );

        boutonSupprimer.addEventListener("click", async () => {
          if (!confirm("Veux-tu vraiment supprimer ce chapitre ?")) return;

          try {
            await deleteDoc(doc(db, "chapters", chapitre.id));
            afficherChapitres();
          } catch (erreur) {
            alert("Suppression impossible.");
          }
        });

        carte.appendChild(boutonModifier);
        carte.appendChild(boutonSupprimer);
      }

      // =================================
      // COMMENTAIRES
      // =================================

      const zoneCommentaires = creerElement("div", "commentaires");

      zoneCommentaires.appendChild(
        creerElement("h4", "", "Commentaires")
      );

      const resultatCommentaires = await getDocs(
        collection(db, "chapters", chapitre.id, "comments")
      );

      const commentaires = resultatCommentaires.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      commentaires.sort((a, b) => {
        return (a.createdAt?.toMillis?.() || 0) -
               (b.createdAt?.toMillis?.() || 0);
      });

      for (const commentaire of commentaires) {
        const bloc = creerElement("div", "commentaire");

        bloc.appendChild(
          creerElement("strong", "", commentaire.authorName || "Membre")
        );

        bloc.appendChild(
          creerElement("p", "", commentaire.text || "")
        );

        // Réponses
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

        for (const reponseDoc of resultatReponses.docs) {
          const reponse = reponseDoc.data();
          const blocReponse = creerElement("div", "reponse");

          blocReponse.appendChild(
            creerElement(
              "strong",
              "",
              reponse.authorName || "Membre"
            )
          );

          blocReponse.appendChild(
            creerElement("p", "", reponse.text || "")
          );

          bloc.appendChild(blocReponse);
        }

        // Répondre à un commentaire
        if (utilisateurActuel && profilActuel) {
          const formulaireReponse = document.createElement("form");
          const champReponse = document.createElement("textarea");
          champReponse.placeholder = "Écrire une réponse...";
          champReponse.required = true;

          const boutonReponse = creerElement(
            "button",
            "",
            "Répondre"
          );

          formulaireReponse.appendChild(champReponse);
          formulaireReponse.appendChild(boutonReponse);

          formulaireReponse.addEventListener("submit", async (e) => {
            e.preventDefault();

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
                  text: champReponse.value.trim(),
                  authorId: utilisateurActuel.uid,
                  authorName: profilActuel.username,
                  createdAt: serverTimestamp()
                }
              );

              afficherChapitres();

            } catch (erreur) {
              alert("Impossible d'envoyer la réponse.");
            }
          });

          bloc.appendChild(formulaireReponse);
        }

        zoneCommentaires.appendChild(bloc);
      }

      // Ajouter un commentaire
      if (utilisateurActuel && profilActuel) {
        const formulaireCommentaire = document.createElement("form");
        const champCommentaire = document.createElement("textarea");

        champCommentaire.placeholder = "Écrire un commentaire...";
        champCommentaire.required = true;

        const boutonCommentaire = creerElement(
          "button",
          "",
          "Envoyer le commentaire"
        );

        formulaireCommentaire.appendChild(champCommentaire);
        formulaireCommentaire.appendChild(boutonCommentaire);

        formulaireCommentaire.addEventListener("submit", async (e) => {
          e.preventDefault();

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

            afficherChapitres();

          } catch (erreur) {
            alert("Impossible d'envoyer le commentaire.");
          }
        });

        zoneCommentaires.appendChild(formulaireCommentaire);

      } else {
        zoneCommentaires.appendChild(
          creerElement(
            "p",
            "",
            "Connecte-toi pour commenter ce chapitre."
          )
        );
      }

      carte.appendChild(zoneCommentaires);
      liste.appendChild(carte);
    }

  } catch (erreur) {
    console.error("Erreur de chargement :", erreur);

    liste.replaceChildren(
      creerElement(
        "p",
        "",
        "Impossible de charger les chapitres. Les règles Firestore doivent être configurées."
      )
    );
  }
}

console.log("Roman Participatif : application initialisée.");
        
