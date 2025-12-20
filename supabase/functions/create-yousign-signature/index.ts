import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import JSZip from "npm:jszip@3.10.1";
import { PDFDocument } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  contractId: string;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function escapeXML(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDateFR(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    // Parse manuel pour éviter les problèmes de fuseau horaire
    // Format attendu: YYYY-MM-DD ou YYYY-MM-DDTHH:MM:SS
    const dateOnly = dateStr.split('T')[0]; // Prend seulement la partie date
    const [year, month, day] = dateOnly.split('-');

    if (!year || !month || !day) return dateStr;

    return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
  } catch {
    return dateStr;
  }
}

async function getPdfPageCount(pdfBytes: ArrayBuffer): Promise<number> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  return pdfDoc.getPageCount();
}

// ✅ util: prend la première valeur non vide
function pickFirst(...vals: any[]) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s !== "" && s !== "undefined" && s !== "null") return s;
  }
  return "";
}

// ✅ util: ajouter X jours à une date ISO
function addDaysISO(dateStr: string, days: number) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
}

/** Map app vars -> Word placeholders (sans signature) */
function mapVariablesToWordFormat(vars: Record<string, any>) {
  const mapped: Record<string, string> = {};

  mapped["first_name"] = String(vars.first_name || "");
  mapped["last_name"] = String(vars.last_name || "");

  if ((!mapped.first_name || !mapped.last_name) && vars.nom_salarie) {
    const parts = String(vars.nom_salarie).trim().split(/\s+/);
    mapped["first_name"] = mapped["first_name"] || (parts[0] || "");
    mapped["last_name"] = mapped["last_name"] || (parts.slice(1).join(" ") || parts[0] || "");
  }

  mapped["birthday"] = vars.birthday ? formatDateFR(vars.birthday) : "";
  mapped["birthplace"] = String(vars.birthplace || "");
  mapped["nationality"] = String(vars.nationality || "");
  mapped["address_1"] = String(vars.address_1 || "");
  mapped["zip"] = String(vars.zip || "");
  mapped["city"] = String(vars.city || "");
  mapped["id_number"] = String(vars.id_number || "");

  // ---------------------------------------------------
  // ✅ CDD (ancien) : contract_start / contract_end
  // (on veut les dates du CDD d'origine)
  // ---------------------------------------------------
  const cddStartRaw = pickFirst(
    vars.cdd_contract_start,
    vars.contract_start_original,
    vars.contract_start_cdd,
    vars.date_debut_cdd,
    vars.cdd_date_debut,
    vars.contract_start,
    vars.date_debut
  );

  const cddEndRaw = pickFirst(
    vars.cdd_contract_end,
    vars.contract_end_original,
    vars.contract_end_cdd,
    vars.date_fin_cdd,
    vars.cdd_date_fin,
    vars.contract_end,
    vars.date_fin
  );

  mapped["contract_start"] = cddStartRaw ? formatDateFR(cddStartRaw) : "";
  mapped["contract_end"] = cddEndRaw ? formatDateFR(cddEndRaw) : "";

  // ---------------------------------------------------
  // ✅ TRIAL (FIX)
  // Objectif: {{trial_period_text}} = une DATE (dd-mm-yyyy)
  // Si trial_period_text est vide, on fallback sur trial_end_date / date_fin_periode_essai
  // ---------------------------------------------------
  const trialEndRaw = pickFirst(
    vars.trial_end_date,
    vars.trialEndDate,
    vars.date_fin_periode_essai,
    vars.trial_end,
    vars.trial_end_iso
  );

  const trialPeriodTextFromEnd = trialEndRaw ? formatDateFR(trialEndRaw) : "";
  mapped["trial_period_text"] = pickFirst(vars.trial_period_text, trialPeriodTextFromEnd);

  // ---------------------------------------------------
  // ✅ AVENANT 1
  // Placeholders Word:
  // {{employees_date_de_debut___av1}}  (3 underscores)
  // {{employees_date_de_fin__av1}}     (2 underscores)
  // ---------------------------------------------------
  const av1StartRaw = pickFirst(
    vars.employees_date_de_debut___av1,
    vars.date_de_debut___av1,
    vars.date_debut_av1,
    vars.avenant1_date_debut,
    vars.avenant_1_date_debut
  );

  const av1EndRaw = pickFirst(
    vars.employees_date_de_fin__av1,
    vars.date_de_fin__av1,
    vars.date_fin_av1,
    vars.avenant1_date_fin,
    vars.avenant_1_date_fin
  );

  // début AV1 = toujours la date de fin du CDD (même date, pas +1 jour)
  const computedAv1StartISO = cddEndRaw || "";
  const av1StartFinal = pickFirst(computedAv1StartISO, av1StartRaw);
  const av1EndFinal = av1EndRaw;

  mapped["employees_date_de_debut___av1"] = av1StartFinal ? formatDateFR(av1StartFinal) : "";
  mapped["employees_date_de_fin__av1"] = av1EndFinal ? formatDateFR(av1EndFinal) : "";

  // ---------------------------------------------------
  // ✅ AVENANT 2
  // début AV2 = toujours la date de fin de l'AV1 (même date, pas +1 jour)
  // ---------------------------------------------------
  const av2StartRaw = pickFirst(
    vars.employees_date_de_debut___av2,
    vars.date_de_debut___av2,
    vars.date_debut_av2,
    vars.avenant2_date_debut,
    vars.avenant_2_date_debut
  );

  const av2EndRaw = pickFirst(
    vars.employees_date_de_fin__av2,
    vars.date_de_fin__av2,
    vars.date_fin_av2,
    vars.avenant2_date_fin,
    vars.avenant_2_date_fin
  );

  const computedAv2StartISO = av1EndRaw || "";
  const av2StartFinal = pickFirst(computedAv2StartISO, av2StartRaw);

  mapped["employees_date_de_debut___av2"] = av2StartFinal ? formatDateFR(av2StartFinal) : "";
  mapped["employees_date_de_fin__av2"] = av2EndRaw ? formatDateFR(av2EndRaw) : "";

  console.log("🧪 MAPPING CHECK:", {
    cddStartRaw,
    cddEndRaw,
    av1StartRaw,
    computedAv1StartISO,
    av1StartFinal,
    av1EndRaw,
    av2StartRaw,
    computedAv2StartISO,
    av2StartFinal,
    av2EndRaw,
    trialEndRaw,
    mapped_contract_start: mapped["contract_start"],
    mapped_contract_end: mapped["contract_end"],
    mapped_trial_period_text: mapped["trial_period_text"],
    mapped_av1_start: mapped["employees_date_de_debut___av1"],
    mapped_av1_end: mapped["employees_date_de_fin__av1"],
    mapped_av2_start: mapped["employees_date_de_debut___av2"],
    mapped_av2_end: mapped["employees_date_de_fin__av2"],
  });

  return mapped;
}

/**
 * Remplace {{key}} même si Word a cassé le token en plusieurs <w:t>.
 */
function replaceAcrossWT(xml: string, replacements: Record<string, string>) {
  const re = /(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g;
  const matches = [...xml.matchAll(re)];
  if (matches.length === 0) return xml;

  type Node = {
    start: number;
    end: number;
    open: string;
    text: string;
    close: string;
    rangeStart: number;
    rangeEnd: number;
  };

  const nodes: Node[] = [];
  let fullText = "";
  let cursorText = 0;

  for (const m of matches) {
    const idx = m.index ?? 0;
    const open = m[1];
    const text = m[2] ?? "";
    const close = m[3];

    const rangeStart = cursorText;
    const rangeEnd = cursorText + text.length;
    cursorText = rangeEnd;

    nodes.push({
      start: idx,
      end: idx + m[0].length,
      open,
      text,
      close,
      rangeStart,
      rangeEnd,
    });

    fullText += text;
  }

  type Occ = { start: number; end: number; value: string; token: string };
  const occs: Occ[] = [];

  for (const [k, v] of Object.entries(replacements)) {
    const token = `{{${k}}}`;
    let from = 0;
    while (true) {
      const pos = fullText.indexOf(token, from);
      if (pos === -1) break;
      occs.push({ start: pos, end: pos + token.length, value: v, token });
      from = pos + token.length;
    }
  }

  if (occs.length === 0) return xml;
  occs.sort((a, b) => b.start - a.start);

  const findNodeIndex = (pos: number) => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].rangeEnd > pos) return i;
    }
    return nodes.length - 1;
  };

  for (const o of occs) {
    const iStart = findNodeIndex(o.start);
    const iEnd = findNodeIndex(o.end - 1);

    const nStart = nodes[iStart];
    const nEnd = nodes[iEnd];

    const localStart = o.start - nStart.rangeStart;
    const localEndInEnd = o.end - nEnd.rangeStart;

    const prefix = nStart.text.slice(0, Math.max(0, localStart));
    const suffix = nEnd.text.slice(Math.max(0, localEndInEnd));

    nStart.text = prefix + o.value + suffix;

    for (let i = iStart + 1; i <= iEnd; i++) nodes[i].text = "";
  }

  let out = "";
  let last = 0;

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    out += xml.slice(last, n.start);
    out += `${n.open}${n.text}${n.close}`;
    last = n.end;
  }
  out += xml.slice(last);

  return out;
}

async function replaceVariablesInDocxRobust(docx: ArrayBuffer, variables: Record<string, any>) {
  const mappedRaw = mapVariablesToWordFormat(variables);
  const mapped: Record<string, string> = {};
  for (const [k, v] of Object.entries(mappedRaw)) mapped[k] = escapeXML(String(v ?? ""));

  console.log("✅ Mapped keys:", Object.keys(mapped));

  const zip = new JSZip();
  const loaded = await zip.loadAsync(docx);

  const targets = [
    "word/document.xml",
    "word/header1.xml",
    "word/header2.xml",
    "word/footer1.xml",
    "word/footer2.xml",
  ];

  for (const filePath of targets) {
    const file = loaded.file(filePath);
    if (!file) continue;

    let xml = await file.async("string");
    const before = xml;

    xml = replaceAcrossWT(xml, mapped);

    if (xml !== before) console.log(`✅ Replaced placeholders in ${filePath}`);
    loaded.file(filePath, xml);
  }

  const out = await loaded.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
  if (!out || out.byteLength === 0) throw new Error("DOCX modified is empty");

  const zipCheck = new JSZip();
  await zipCheck.loadAsync(out);
  if (!zipCheck.file("word/document.xml")) throw new Error("DOCX corrupted (document.xml missing)");

  console.log("✅ Modified DOCX size:", out.byteLength);
  return out;
}

async function convertDocxToPdfCloudConvert(docxUrl: string, variables: Record<string, any>) {
  const CLOUDCONVERT_API_KEY = Deno.env.get("CLOUDCONVERT_API_KEY");
  if (!CLOUDCONVERT_API_KEY) throw new Error("CLOUDCONVERT_API_KEY missing");

  console.log("📥 Downloading DOCX:", docxUrl);
  const resp = await fetch(docxUrl);
  if (!resp.ok) throw new Error(`DOCX download failed: ${resp.status} ${resp.statusText}`);
  let docx = await resp.arrayBuffer();
  console.log("✅ Downloaded DOCX size:", docx.byteLength);

  console.log("🔧 Replacing variables in DOCX (ROBUST)...");
  docx = await replaceVariablesInDocxRobust(docx, variables);

  console.log("📤 Creating CloudConvert job...");
  const jobResp = await fetch("https://api.cloudconvert.com/v2/jobs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLOUDCONVERT_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tasks: {
        "upload-docx": { operation: "import/upload" },
        "convert-to-pdf": {
          operation: "convert",
          input: ["upload-docx"],
          output_format: "pdf",
          engine: "office",
        },
        "export-pdf": { operation: "export/url", input: ["convert-to-pdf"] },
      },
    }),
  });

  const jobData = await jobResp.json();
  if (!jobResp.ok) {
    console.error("❌ CloudConvert job create failed:", jobData);
    throw new Error(`CloudConvert job create failed: ${jobResp.status}`);
  }

  const jobId = jobData.data.id;
  console.log("✅ CloudConvert jobId:", jobId);

  const uploadTask = jobData.data.tasks.find((t: any) => t.name === "upload-docx");
  const uploadUrl = uploadTask.result.form.url;
  const uploadParams = uploadTask.result.form.parameters;

  const form = new FormData();
  for (const [k, v] of Object.entries(uploadParams)) form.append(k, String(v));
  form.append("file", new Blob([docx]), "contract.docx");

  console.log("📤 Uploading DOCX to CloudConvert...");
  const up = await fetch(uploadUrl, { method: "POST", body: form });
  if (!up.ok) {
    const t = await up.text();
    console.error("❌ CloudConvert upload failed:", up.status, t);
    throw new Error(`CloudConvert upload failed: ${up.status}`);
  }

  let status = jobData.data.status;
  let attempts = 0;
  let finalData = jobData;

  while (status !== "finished" && status !== "error" && attempts < 30) {
    await sleep(2000);
    const s = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${CLOUDCONVERT_API_KEY}` },
    });
    finalData = await s.json();
    status = finalData.data.status;
    attempts++;
    console.log(`⏳ CloudConvert status: ${status} (${attempts}/30)`);
  }

  if (status === "error") {
    console.error("❌ CloudConvert error:", JSON.stringify(finalData, null, 2));
    const convertTask = finalData?.data?.tasks?.find((t: any) => t.name === "convert-to-pdf");
    const code = convertTask?.code || "UNKNOWN";
    const msg = convertTask?.message || "Unknown CloudConvert error";
    throw new Error(`CloudConvert conversion failed: ${code} - ${msg}`);
  }

  const exportTask = finalData.data.tasks.find((t: any) => t.name === "export-pdf");
  const pdfUrl = exportTask?.result?.files?.[0]?.url;
  if (!pdfUrl) throw new Error("PDF URL missing (CloudConvert)");

  console.log("📥 Downloading PDF:", pdfUrl);
  const pdfResp = await fetch(pdfUrl);
  if (!pdfResp.ok) throw new Error(`PDF download failed: ${pdfResp.status} ${pdfResp.statusText}`);
  const pdf = await pdfResp.arrayBuffer();
  console.log("✅ PDF size:", pdf.byteLength);

  return pdf;
}

async function yousignFetch(url: string, init: RequestInit) {
  const r = await fetch(url, init);
  const txt = await r.text();
  let json: any = null;
  try {
    json = txt ? JSON.parse(txt) : null;
  } catch {
    // ignore
  }

  if (!r.ok) {
    console.error("❌ Yousign API error:", r.status, txt);
    throw new Error(`Yousign API failed ${r.status}: ${txt}`);
  }
  return json ?? txt;
}

function buildPublicStorageUrl(supabaseUrl: string, storagePath: string) {
  const parts = storagePath.split("/").filter(Boolean);
  const bucket = parts.shift();
  const objectPath = parts.join("/");
  if (!bucket || !objectPath) throw new Error(`storage_path invalide: ${storagePath}`);
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const { contractId } = (await req.json()) as Body;
    if (!contractId) {
      return new Response(JSON.stringify({ success: false, error: "contractId missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const YOUSIGN_API_KEY = Deno.env.get("YOUSIGN_API_KEY");
    const YOUSIGN_BASE_URL = Deno.env.get("YOUSIGN_BASE_URL") ?? "https://api.yousign.app/v3";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !YOUSIGN_API_KEY) {
      throw new Error("Missing env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / YOUSIGN_API_KEY");
    }

    console.log("🟢 contractId:", contractId);

    const contractResp = await fetch(
      `${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}&select=*,profil:profil_id(*),modele:modele_id(*)`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Accept: "application/json",
        },
      },
    );

    const arr = await contractResp.json();
    const contract = arr?.[0];
    if (!contract) throw new Error("Contract not found");

    let docxUrl: string | null = null;
    if (contract.modele?.fichier_url) docxUrl = contract.modele.fichier_url;
    else if (contract.fichier_contrat_url) docxUrl = contract.fichier_contrat_url;
    else if (contract.storage_path) docxUrl = buildPublicStorageUrl(SUPABASE_URL, contract.storage_path);

    if (!docxUrl) throw new Error("Aucun modèle DOCX trouvé (modele_id / fichier_contrat_url / storage_path vides)");
    console.log("📄 Using DOCX URL:", docxUrl);

    const rawVars =
      typeof contract.variables === "string"
        ? JSON.parse(contract.variables || "{}")
        : (contract.variables || {});

    const employeeEmail = contract.profil?.email || "";
    const employeeName = contract.profil
      ? `${contract.profil.prenom ?? ""} ${contract.profil.nom ?? ""}`.trim()
      : "Salarié";

    if (!employeeEmail || !employeeEmail.includes("@")) throw new Error("Email salarié invalide");

    // ✅ TRIAL (FIX): récupère la date depuis profil.date_fin_periode_essai
    const trialEndISO = pickFirst(
      rawVars.trial_end_date,
      rawVars.date_fin_periode_essai,
      contract.date_fin_periode_essai,
      contract.profil?.date_fin_periode_essai, // ✅ ton champ est là !
    );

    console.log("🧪 TRIAL DEBUG:", {
      raw_trial_end_date: rawVars?.trial_end_date,
      raw_date_fin_periode_essai: rawVars?.date_fin_periode_essai,
      contract_date_fin_periode_essai: contract?.date_fin_periode_essai,
      profil_date_fin_periode_essai: contract?.profil?.date_fin_periode_essai,
      trialEndISO,
    });

    const enriched = {
      ...rawVars,

      nom_salarie: employeeName,
      first_name: contract.profil?.prenom || rawVars.first_name || "",
      last_name: contract.profil?.nom || rawVars.last_name || "",
      birthday: contract.profil?.date_naissance || rawVars.birthday || "",
      birthplace: contract.profil?.lieu_naissance || rawVars.birthplace || "",
      nationality: contract.profil?.nationalite || rawVars.nationality || "",
      address_1: contract.profil?.adresse || rawVars.address_1 || "",
      city: contract.profil?.ville || rawVars.city || "",
      zip: contract.profil?.code_postal || rawVars.zip || "",
      id_number: contract.profil?.numero_piece_identite || rawVars.id_number || "",

      contract_start: pickFirst(rawVars.contract_start, rawVars.cdd_contract_start, rawVars.contract_start_original, contract.date_debut),
      contract_end: pickFirst(rawVars.contract_end, rawVars.cdd_contract_end, rawVars.contract_end_original),

      avenant_1_date_debut: pickFirst(contract.profil?.avenant_1_date_debut, rawVars.avenant_1_date_debut),
      avenant_1_date_fin: pickFirst(contract.profil?.avenant_1_date_fin, rawVars.avenant_1_date_fin),

      avenant_2_date_debut: pickFirst(contract.profil?.avenant_2_date_debut, rawVars.avenant_2_date_debut),
      avenant_2_date_fin: pickFirst(contract.profil?.avenant_2_date_fin, rawVars.avenant_2_date_fin),

      // ✅ TRIAL (FIX): on pousse un champ "trial_end_date" lisible par le mapping
      trial_end_date: trialEndISO,

      // si ton front l’envoie déjà, ok, sinon le mapping fallback sur trial_end_date
      trial_period_text: rawVars.trial_period_text || "",
    };

    console.log("✅ employeeName:", employeeName);
    console.log("✅ employeeEmail:", employeeEmail);

    const pdf = await convertDocxToPdfCloudConvert(docxUrl, enriched);

    const pageCount = await getPdfPageCount(pdf);
    console.log("📄 PDF pageCount:", pageCount);

    const pdfBlob = new Blob([pdf], { type: "application/pdf" });

    const exp = new Date();
    exp.setHours(exp.getHours() + 48);

    const signatureRequest = await yousignFetch(`${YOUSIGN_BASE_URL}/signature_requests`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${YOUSIGN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Contrat de travail - ${employeeName}`,
        delivery_mode: "email",
        timezone: "Europe/Paris",
        expiration_date: exp.toISOString().split("T")[0],
        external_id: contractId,
      }),
    });

    const signatureRequestId = signatureRequest.id;
    console.log("✅ Signature request created:", signatureRequestId);

    const uploadForm = new FormData();
    uploadForm.append("nature", "signable_document");
    uploadForm.append("parse_anchors", "true");
    uploadForm.append("file", pdfBlob, `contrat_${employeeName.replace(/\s+/g, "_")}.pdf`);

    const documentData = await yousignFetch(
      `${YOUSIGN_BASE_URL}/signature_requests/${signatureRequestId}/documents`,
      { method: "POST", headers: { Authorization: `Bearer ${YOUSIGN_API_KEY}` }, body: uploadForm },
    );

    const documentId = documentData.id;
    console.log("✅ Document uploaded:", documentId);

    let anchorsDetected = false;
    try {
      const fields = await yousignFetch(
        `${YOUSIGN_BASE_URL}/signature_requests/${signatureRequestId}/documents/${documentId}/fields`,
        { method: "GET", headers: { Authorization: `Bearer ${YOUSIGN_API_KEY}` } },
      );
      anchorsDetected = Array.isArray(fields) ? fields.length > 0 : (fields?.data?.length ?? 0) > 0;
      console.log("🔎 Anchors detected via fields:", anchorsDetected);
    } catch (e) {
      console.log(
        "⚠️ Could not read fields endpoint, fallback to manual if needed:",
        String((e as any)?.message || e),
      );
      anchorsDetected = false;
    }

    const parts = employeeName.trim().split(/\s+/);
    const firstName = parts[0] || employeeName;
    const lastName = parts.slice(1).join(" ") || firstName;

    const signX = Number(Deno.env.get("YOUSIGN_SIGN_X") || "400");
    const signY = Number(Deno.env.get("YOUSIGN_SIGN_Y") || "650");
    const signW = Number(Deno.env.get("YOUSIGN_SIGN_W") || "180");

    const envPageRaw = Number(Deno.env.get("YOUSIGN_SIGN_PAGE") || "");
    let signPage = Number.isFinite(envPageRaw) && envPageRaw > 0 ? envPageRaw : pageCount;
    if (signPage > pageCount) {
      console.log(`⚠️ YOUSIGN_SIGN_PAGE=${signPage} > pageCount=${pageCount}. Using last page.`);
      signPage = pageCount;
    }
    if (signPage < 1) signPage = 1;

    const signerPayload: any = {
      info: { first_name: firstName, last_name: lastName, email: employeeEmail, locale: "fr" },
      signature_level: "electronic_signature",
      signature_authentication_mode: "no_otp",
    };

    if (!anchorsDetected) {
      signerPayload.fields = [
        { document_id: documentId, type: "signature", page: signPage, width: signW, x: signX, y: signY },
      ];
      console.log("🧷 Using MANUAL signature field:", signerPayload.fields[0], "pageCount:", pageCount);
    } else {
      console.log("🧷 Using SMART ANCHORS (no manual fields)");
    }

    const signerData = await yousignFetch(
      `${YOUSIGN_BASE_URL}/signature_requests/${signatureRequestId}/signers`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${YOUSIGN_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(signerPayload),
      },
    );

    console.log("✅ Signer added:", signerData.id);

    const activated = await yousignFetch(
      `${YOUSIGN_BASE_URL}/signature_requests/${signatureRequestId}/activate`,
      { method: "POST", headers: { Authorization: `Bearer ${YOUSIGN_API_KEY}` } },
    );

    console.log("✅ Activated");

    const signatureLink = activated?.signers?.[0]?.signature_link ?? null;

    await fetch(`${SUPABASE_URL}/rest/v1/contrat?id=eq.${contractId}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        yousign_signature_request_id: signatureRequestId,
        yousign_signer_id: signerData.id,
        statut: "en_attente_signature",
        yousign_document_url: signatureLink,
      }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        signatureRequestId,
        signerId: signerData.id,
        documentId,
        signatureLink,
        anchorsDetected,
        pageCount,
        usedManualPage: !anchorsDetected ? signPage : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("❌ Error:", (e as any)?.message || e);
    return new Response(JSON.stringify({ success: false, error: String((e as any)?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
