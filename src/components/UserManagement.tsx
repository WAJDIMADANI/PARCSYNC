import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AppUser = {
  id: string;
  auth_user_id: string | null;
  email: string;
  nom: string | null;
  prenom: string | null;
  pole_id?: string | null;
  actif: boolean;
  created_at: string;
};

type Pole = {
  id: string;
  nom: string;
};

type CreateUserPayload = {
  email: string;
  nom: string;
  prenom: string;
  pole_id: string | null;
};

type CreateUserResponse =
  | { ok: true; invited: boolean; auth_user_id: string; app_user_id: string }
  | { ok: false; error: string; details?: any };

async function explainInvokeError(err: unknown): Promise<string> {
  try {
    if (err instanceof FunctionsHttpError) {
      const res = err.context;
      const txt = await res.text();
      return `HTTP ${res.status} - ${txt || res.statusText}`;
    }
    if (err instanceof FunctionsRelayError) {
      return `RelayError - ${err.message}`;
    }
    if (err instanceof FunctionsFetchError) {
      return `FetchError - ${err.message}`;
    }
    if (err instanceof Error) return err.message;
    return String(err);
  } catch {
    return "Erreur inconnue (impossible de lire le détail).";
  }
}

export default function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [poles, setPoles] = useState<Pole[]>([]);
  const [loading, setLoading] = useState(false);

  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [poleId, setPoleId] = useState<string>("__ADMIN__"); // "__ADMIN__" => null côté DB

  const admins = useMemo(() => users.filter((u) => !u.pole_id), [users]);
  const nonAdmins = useMemo(() => users.filter((u) => !!u.pole_id), [users]);

  function resetForm() {
    setPrenom("");
    setNom("");
    setEmail("");
    setPoleId("__ADMIN__");
  }

  async function loadUsersAndPoles() {
    setLoading(true);
    try {
      // 1) Users
      const { data: uData, error: uErr } = await supabase
        .from("app_utilisateur")
        .select("id, auth_user_id, email, nom, prenom, pole_id, actif, created_at")
        .order("created_at", { ascending: false });

      if (uErr) throw uErr;
      setUsers((uData ?? []) as AppUser[]);

      // 2) Poles (si table existe)
      const { data: pData, error: pErr } = await supabase
        .from("poles")
        .select("id, nom")
        .order("nom", { ascending: true });

      if (!pErr) setPoles((pData ?? []) as Pole[]);
    } catch (e) {
      toast.error("Impossible de charger les utilisateurs", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsersAndPoles();
  }, []);

  async function handleAddUser() {
    const cleanEmail = email.trim().toLowerCase();
    const cleanNom = nom.trim();
    const cleanPrenom = prenom.trim();

    if (!cleanEmail || !cleanNom || !cleanPrenom) {
      toast.error("Champs obligatoires manquants", {
        description: "Email, Nom, Prénom sont requis.",
      });
      return;
    }

    const payload: CreateUserPayload = {
      email: cleanEmail,
      nom: cleanNom,
      prenom: cleanPrenom,
      pole_id: poleId === "__ADMIN__" ? null : poleId,
    };

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke<CreateUserResponse>(
        "admin-create-user",
        { body: payload }
      );

      if (error) throw error;

      if (!data || data.ok !== true) {
        const msg = (data as any)?.error || "Réponse invalide de la fonction.";
        throw new Error(msg);
      }

      toast.success("Utilisateur créé", {
        description: data.invited
          ? `Invitation envoyée à ${payload.email}`
          : `Compte lié / déjà existant pour ${payload.email}`,
      });

      setOpenCreate(false);
      resetForm();
      await loadUsersAndPoles();
    } catch (e) {
      const msg = await explainInvokeError(e);
      toast.error("Création utilisateur : échec", { description: msg });
      // IMPORTANT: on garde le popup ouvert pour que tu puisses corriger
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Gestion des utilisateurs</h2>
          <p className="text-sm text-muted-foreground">
            Crée des utilisateurs et gère leurs permissions.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setOpenCreate(true)}>Ajouter un utilisateur</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-2">
            <h3 className="font-semibold">Administrateurs ({admins.length})</h3>
            <div className="rounded-md border">
              <div className="grid grid-cols-12 gap-2 p-3 text-xs font-medium text-muted-foreground">
                <div className="col-span-4">Email</div>
                <div className="col-span-3">Nom</div>
                <div className="col-span-3">Prénom</div>
                <div className="col-span-2 text-right">Statut</div>
              </div>
              {admins.map((u) => (
                <div key={u.id} className="grid grid-cols-12 gap-2 border-t p-3 text-sm">
                  <div className="col-span-4">{u.email}</div>
                  <div className="col-span-3">{u.nom ?? "-"}</div>
                  <div className="col-span-3">{u.prenom ?? "-"}</div>
                  <div className="col-span-2 text-right">{u.actif ? "Actif" : "Inactif"}</div>
                </div>
              ))}
              {admins.length === 0 && (
                <div className="border-t p-3 text-sm text-muted-foreground">Aucun admin.</div>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Utilisateurs ({nonAdmins.length})</h3>
            <div className="rounded-md border">
              <div className="grid grid-cols-12 gap-2 p-3 text-xs font-medium text-muted-foreground">
                <div className="col-span-4">Email</div>
                <div className="col-span-3">Nom</div>
                <div className="col-span-3">Prénom</div>
                <div className="col-span-2 text-right">Statut</div>
              </div>
              {nonAdmins.map((u) => (
                <div key={u.id} className="grid grid-cols-12 gap-2 border-t p-3 text-sm">
                  <div className="col-span-4">{u.email}</div>
                  <div className="col-span-3">{u.nom ?? "-"}</div>
                  <div className="col-span-3">{u.prenom ?? "-"}</div>
                  <div className="col-span-2 text-right">{u.actif ? "Actif" : "Inactif"}</div>
                </div>
              ))}
              {nonAdmins.length === 0 && (
                <div className="border-t p-3 text-sm text-muted-foreground">Aucun utilisateur.</div>
              )}
            </div>
          </section>
        </div>
      )}

      <Dialog
        open={openCreate}
        onOpenChange={(v) => {
          setOpenCreate(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un utilisateur</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Prénom</Label>
              <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Ex: Wajdi" />
            </div>

            <div className="space-y-1">
              <Label>Nom</Label>
              <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Madani" />
            </div>

            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="exemple@domaine.com" />
            </div>

            <div className="space-y-1">
              <Label>Pôle (optionnel)</Label>
              <Select value={poleId} onValueChange={setPoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un pôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ADMIN__">Sans pôle (Admin)</SelectItem>
                  {poles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Les utilisateurs sans pôle sont considérés comme administrateurs.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenCreate(false)}
              disabled={creating}
            >
              Annuler
            </Button>
            <Button onClick={handleAddUser} disabled={creating}>
              {creating ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
