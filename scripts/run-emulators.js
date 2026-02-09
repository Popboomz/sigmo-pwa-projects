const { spawn } = require("child_process");

const javaHome = "C:\\Program Files\\Microsoft\\jdk-21.0.10.7-hotspot";
const javaBin = `${javaHome}\\bin`;

process.env.JAVA_HOME = javaHome;
process.env.PATH = `${javaBin};${process.env.PATH}`;

const child = spawn(
  "firebase",
  ["emulators:start", "--only", "auth,firestore", "--project", "demo-test"],
  { stdio: "inherit", shell: true }
);

child.on("exit", (code) => process.exit(code ?? 1));
