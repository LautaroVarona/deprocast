import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function testMissingCredentials() {
  const env = { ...process.env };
  delete env.GOOGLE_APPLICATION_CREDENTIALS;
  delete env.GOOGLE_CLOUD_PROJECT;

  const credentialsPath = env.GOOGLE_APPLICATION_CREDENTIALS;
  assert(!credentialsPath, "Se esperaba ausencia de GOOGLE_APPLICATION_CREDENTIALS");
  console.log("OK  error esperado sin GOOGLE_APPLICATION_CREDENTIALS");
}

function testValidCredentials() {
  const credentialsFile = path.join(
    root,
    "local-transcriber-498907-dc909fc4d9b9.json",
  );
  assert(fs.existsSync(credentialsFile), `No existe ${credentialsFile}`);

  const parsed = JSON.parse(fs.readFileSync(credentialsFile, "utf-8"));
  assert(parsed.project_id === "local-transcriber-498907", "project_id inesperado");
  assert(parsed.client_email?.includes("transcriptor-local"), "client_email inesperado");
  console.log("OK  credenciales JSON válidas");
}

function testEnvExample() {
  const examplePath = path.join(root, ".env.example");
  assert(fs.existsSync(examplePath), "Falta .env.example");
  const content = fs.readFileSync(examplePath, "utf-8");
  assert(content.includes("GOOGLE_APPLICATION_CREDENTIALS"), "Falta GOOGLE_APPLICATION_CREDENTIALS en .env.example");
  assert(content.includes("chirp_2"), "Falta GCP_SPEECH_MODEL en .env.example");
  console.log("OK  .env.example contiene variables GCP");
}

function testModuleFiles() {
  const required = [
    "lib/gcp-speech/config.ts",
    "lib/gcp-speech/client.ts",
    "lib/gcp-speech/audio-prep.ts",
    "lib/gcp-speech/transcribe-sync.ts",
    "lib/gcp-speech/transcribe-chunked.ts",
    "lib/gcp-speech-processor.ts",
    "lib/processing-queue.ts",
  ];

  for (const relativePath of required) {
    const fullPath = path.join(root, relativePath);
    assert(fs.existsSync(fullPath), `Falta archivo ${relativePath}`);
  }

  const queueSource = fs.readFileSync(
    path.join(root, "lib/processing-queue.ts"),
    "utf-8",
  );
  assert(
    queueSource.includes("processAssetGcpSpeech"),
    "processing-queue no importa processAssetGcpSpeech",
  );
  assert(
    !queueSource.includes("whisper-processor"),
    "processing-queue aún referencia whisper-processor",
  );

  console.log("OK  estructura de módulos GCP presente");
}

testMissingCredentials();
testValidCredentials();
testEnvExample();
testModuleFiles();
console.log("\nValidación local completada.");
