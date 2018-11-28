import osjs from "osjs";
import {name as applicationName} from "./metadata.json";

import {
	h,
	app
} from "hyperapp";

import {
	Box,BoxContainer,Button,Icon,Menubar,MenubarItem
} from "@osjs/gui";

require("nes-js");

const register = (core,args,options,metadata) => {
	const proc = core.make('osjs/application',{args,options,metadata});
	var canvas = document.createElement("canvas");
	var nes = new NesJs.Nes();
	nes.setDisplay(new NesJs.Display(canvas));
	nes.setAudio(new NesJs.Audio());
	const loadFile = async file => {
		const data = await core.make("osjs/vfs").readfile(file,"arraybuffer");
		try {
			nes.setRom(new NesJs.Rom(data));
			nes.bootup();
			nes.run();
		} catch(ex) {
			core.make("osjs/dialog","alert",{ message: ex.message, title: ex.name },(btn, value) => {});
		}
	};
	proc.createWindow({
		id: "NESWindow",
		title: metadata.title.en_EN+" (0 FPS)",
		dimension: { width: 256, height: 300 },
		position: { left: 700, top: 200 },
		attributes: { minDimension: { width: 256, height: 300 } }
	})
	.on("destroy",() => {
		if(nes.state == nes.STATES.RUN) nes.stop();
		proc.destroy();
	})
	.on("resized",dimension => {
		dimension.height -= 60;
		canvas.style.width = dimension.width+"px";
		canvas.style.height = dimension.height+"px";
	})
	.on("keydown",ev => nes.handleKeyDown(ev))
	.on("keyup",ev => nes.handleKeyUp(ev))
	.on("drop",(ev,data) => {
    	if(data.isFile && data.mime) {
			if(/application\/octet-stream/.test(data.mime)) {
				loadFile(data);
			}
		}
	})
	.on("blur",() => nes.stop())
	.on("focus",() => nes.resume())
    .render(($content,win) => {
		nes.addEventListener("fps",fps => {
			win.setTitle("NES Emulator ("+fps.toString().substring(0,5)+" FPS)");
		});
		canvas.onresize = () => {
			win.setDimension({ width: canvas.width, height: canvas.height });
		};
		app({
		},{
			menuFile: ev => (state,actions) => {
				core.make("osjs/contextmenu").show({
					position: ev.target,
					menu: [
						{ label: "Open", onclick: () => {
							core.make("osjs/dialog","file",{ type: "open", mime: [ /application\/octet-stream/ ] },(btn,item) => {
								if(btn == "ok") loadFile(item);
							});
						} },
						{ label: "Quit", onclick: () => proc.destroy() }
					]
				});
			},
			menuEmulation: ev => (state,actions) => {
				var menu = [];
				if(nes.state == nes.STATES.RUN || nes.state == nes.STATES.STOP) {
					menu.push({ label: "Reset", onclick: () => nes.reset() });
					menu.push({ label: "Step", onclick: () => nes.runStep() });
					menu.push({ label: "Cycle", onclick: () => nes.runCycle() });
					if(nes.state == nes.STATES.RUN) menu.push({ label: "Stop", onclick: () => nes.stop() });
					if(nes.state == nes.STATES.STOP) menu.push({ label: "Resume", onclick: () => nes.resume() });
				}
				if(nes.audioEnabled) menu.push({ label: "Disable Audio", onclick: () => { nes.audioEnabled = false; } });
				else menu.push({ label: "Enable Audio", onclick: () => { nes.audioEnabled = true; } });
				// TODO: add dumping
				if(menu.length == 0) return;
				core.make("osjs/contextmenu").show({
					position: ev.target,
					menu: menu
				});
			}
		},(state,actions) => h(Box,{ grow: 1, padding: false },[
			h(Menubar,{},[
				h(MenubarItem,{ onclick: ev => actions.menuFile(ev) },"File"),
				h(MenubarItem,{ onclick: ev => actions.menuEmulation(ev) },"Emulation")
			]),
			h("div",{ oncreate: el => el.appendChild(canvas) })
		]),$content);
	});
	return proc;
};

osjs.register(applicationName,register);
