import fs from 'fs';

fs.readFile(process.argv[2], (err, data) => {
	fs.writeFile(
		process.argv[3],
		`export default new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array([${Array.from(
			data,
		)}])));`,
		err => console.log(err),
	);
});
