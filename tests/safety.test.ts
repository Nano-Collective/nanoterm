import test from "ava";
import { isDangerousCommand } from "../src/safety.js";

test("isDangerousCommand flags recursive removals", (t) => {
	t.true(isDangerousCommand("rm -rf /"));
	t.true(isDangerousCommand("rm -r node_modules"));
	t.true(isDangerousCommand("rm -fr ."));
	t.false(isDangerousCommand("rm file.txt"));
});

test("isDangerousCommand flags recursive chmod and chown", (t) => {
	t.true(isDangerousCommand("chmod -R 777 ."));
	t.true(isDangerousCommand("chown -R user:group /var"));
	t.false(isDangerousCommand("chmod +x script.sh"));
});

test("isDangerousCommand flags disk and raw formatting commands", (t) => {
	t.true(isDangerousCommand("mkfs.ext4 /dev/sda1"));
	t.true(isDangerousCommand("fdisk -l"));
	t.true(isDangerousCommand("dd if=/dev/zero of=/dev/sda"));
});

test("isDangerousCommand flags output to raw devices", (t) => {
	t.true(isDangerousCommand('echo "hello" > /dev/sda'));
	t.true(isDangerousCommand("mv my_file /dev/null"));
	t.false(isDangerousCommand('echo "hello" > file.txt'));
});
