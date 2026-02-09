const { spawn } = require("child_process");
const fs = require("fs");

const defaultJavaHome = "C:\\Program Files\\Microsoft\\jdk-21.0.10.7-hotspot";
const javaHome = process.env.JAVA_HOME || defaultJavaHome;
const javaBin = `${javaHome}\\bin`;

if (fs.existsSync(javaBin)) {
  process.env.JAVA_HOME = javaHome;
  process.env.PATH = `${javaBin};${process.env.PATH}`;
} else {
  console.warn("JAVA_HOME not set and default JDK path not found:", javaHome);
}

const child = spawn(
  "firebase",
  ["emulators:start", "--only", "auth,firestore", "--project", "demo-test"],
  { stdio: "inherit", shell: true }
);

child.on("exit", (code) => process.exit(code ?? 1));
