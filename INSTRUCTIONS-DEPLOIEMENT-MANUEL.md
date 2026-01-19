# 🚀 Déploiement manuel de send-simple-email

## ⚠️ Problème rencontré

L'outil automatique de déploiement Supabase rencontre une erreur. Voici comment déployer manuellement.

## ✅ Solution : Déploiement via le terminal

### Option 1 : Depuis votre terminal local

1. **Ouvrez un terminal** sur votre machine locale
2. **Naviguez vers le projet** :
   ```bash
   cd /chemin/vers/votre/projet
   ```

3. **Vérifiez que vous êtes lié au projet Supabase** :
   ```bash
   supabase link
   ```
   Si pas encore lié, suivez les instructions pour vous connecter.

4. **Déployez la fonction** :
   ```bash
   supabase functions deploy send-simple-email --no-verify-jwt
   ```

5. **Attendez la confirmation** :
   ```
   ✓ Deployed Function send-simple-email
   ```

### Option 2 : Via le Dashboard Supabase

1. **Allez sur** : https://supabase.com/dashboard
2. **Sélectionnez votre projet**
3. **Allez dans** : Functions (menu de gauche)
4. **Cliquez sur** : "Create a new function"
5. **Nom** : `send-simple-email`
6. **Copiez le contenu** du fichier `supabase/functions/send-simple-email/index.ts`
7. **Collez dans l'éditeur**
8. **Déployez**

### Option 3 : Via le script automatique

Si vous avez le CLI Supabase installé :

```bash
chmod +x DEPLOYER-SEND-SIMPLE-EMAIL-MAINTENANT.sh
./DEPLOYER-SEND-SIMPLE-EMAIL-MAINTENANT.sh
```

## 🔍 Vérifier que ça marche

Après le déploiement, testez dans l'interface :

1. Allez dans **RH > Emails**
2. Sélectionnez un salarié
3. Écrivez un objet et un message test
4. Envoyez

Si vous recevez une erreur 404, la fonction n'est pas encore déployée.
Si ça marche, vous verrez "Envoyé avec succès !".

## 📝 Note importante

Le fichier de la fonction est prêt ici :
```
supabase/functions/send-simple-email/index.ts
```

Il suffit de le déployer une seule fois pour que tout fonctionne.

## 🆘 En cas de problème

Si le déploiement échoue :

1. Vérifiez que Supabase CLI est installé : `supabase --version`
2. Vérifiez que vous êtes connecté : `supabase login`
3. Vérifiez que le projet est lié : `supabase link`
4. Réessayez le déploiement

Si rien ne fonctionne, contactez le support Supabase ou utilisez l'option 2 (Dashboard).
