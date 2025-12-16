# Fix : Page blanche lors de l'activation d'un salarié

## Problème identifié

**Erreur en console** :
```
Uncaught TypeError: Cannot read properties of undefined (reading 'get')
at u.cleanHref (chmln.js:2:344769)
```

**Cause** : Dans `ContractValidationPanel.tsx`, le code essayait d'accéder à `contract.modele.nom` sans vérifier si `modele` existe. Pour les contrats importés en masse (sans modèle), cela causait une erreur JavaScript qui bloquait l'affichage.

---

## Corrections appliquées

### 1. Vérification de l'existence du modèle

**Avant** :
```javascript
<h3 className="font-semibold text-blue-900">Contrat : {contract.modele.nom}</h3>
<p className="text-sm text-blue-700 mt-1">Type : {contract.modele.type_contrat}</p>
```

**Après** :
```javascript
<h3 className="font-semibold text-blue-900">
  Contrat : {contract.modele?.nom || contract.variables?.type_contrat || contract.type || 'Non spécifié'}
</h3>
<p className="text-sm text-blue-700 mt-1">
  Type : {contract.modele?.type_contrat || contract.type || 'Non spécifié'}
</p>
```

### 2. Interface TypeScript mise à jour

```typescript
interface Contract {
  id: string;
  type: string;  // ← Ajouté
  variables: Record<string, any>;
  date_envoi: string | null;  // ← Peut être null
  date_signature: string | null;
  statut: string;
  certificat_medical_id: string | null;
  dpae_id: string | null;
  modele: {
    nom: string;
    type_contrat: string;
  } | null;  // ← Peut être null
  profil: {
    email: string;
  } | null;  // ← Peut être null
}
```

### 3. Vérification de date_envoi

```javascript
{contract.date_envoi && (
  <p className="text-sm text-blue-700">
    Envoyé le {new Date(contract.date_envoi).toLocaleDateString('fr-FR')}
  </p>
)}
```

---

## Pourquoi ça se produisait

Les salariés importés en masse via `ImportSalariesBulk.tsx` :
- N'ont pas de `modele_id` (ils sont importés sans modèle de contrat)
- Leur type est stocké dans `contrat.type` directement
- Leur `date_envoi` peut être NULL car ils sont marqués comme déjà signés

Quand on tentait d'activer ces salariés, le code essayait d'accéder à `contract.modele.nom` qui était `undefined`, causant une erreur JavaScript qui arrêtait tout le rendu de la page (page blanche).

---

## Test après correction

1. Rechargez l'application (F5)
2. Cliquez sur un salarié importé
3. Cliquez sur "Activer le salarié"
4. Le modal devrait maintenant s'afficher correctement

**Affichage attendu** :
- Contrat : CDD (ou CDI selon le type)
- Type : cdd (ou cdi)
- Les autres informations du contrat

---

## Cas gérés

Le composant gère maintenant correctement :
- Contrats avec modèle (Yousign, créés via l'interface)
- Contrats sans modèle (imports en masse)
- Contrats sans date d'envoi
- Contrats avec modèle null
- Contrats avec profil null

Tous les champs utilisent l'optional chaining (`?.`) ou des fallbacks pour éviter les erreurs.
