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
	const proc = core.make("osjs/application",{args,options,metadata});
	const {translatable} = core.make("osjs/locale");
	const _ = translatable(require("./locales.js"));
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
		title: _("WIN_TITLE",0),
		icon: proc.resource(metadata.icon),
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
			const found = metadata.mimes.find(m => (new RegExp(m)).test(data.mime));
			if(found) loadFile(data);
		}
	})
	.on("blur",() => nes.stop())
	.on("focus",() => nes.resume())
    .render(($content,win) => {
		nes.addEventListener("fps",fps => {
			win.setTitle(_("WIN_TITLE",fps.toString().substring(0,5)));
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
						{ label: _("FILE_OPEN"), onclick: () => {
							core.make("osjs/dialog","file",{ type: "open", mime: metadata.mimes },(btn,item) => {
								if(btn == "ok") loadFile(item);
							});
						} },
						{ label: _("FILE_QUIT"), onclick: () => proc.destroy() }
					]
				});
			},
			menuEmulation: ev => (state,actions) => {
				core.make("osjs/contextmenu").show({
					position: ev.target,
					menu: [
						{ disable: nes.state != nes.STATES.RUN && nes.state != nes.STATES.STOP, label: _("EMULATION_RESET"), onclick: () => nes.reset() },
						{ disable: nes.state != nes.STATES.RUN && nes.state != nes.STATES.STOP, label: _("EMULATION_STEP"), onclick: () => nes.runStep() },
						{ disable: nes.state != nes.STATES.RUN && nes.state != nes.STATES.STOP, label: _("EMULATION_CYCLE"), onclick: () => nes.runCycle() },
						{ disable: nes.state != nes.STATES.RUN, label: _("EMULATION_STOP"), onclick: () => nes.stop() },
						{ disable: nes.state != nes.STATES.STOP, label: _("EMULATION_RESUME"), onclick: () => nes.resume() },
						{ label: nes.audioEnabled ? _("EMULATION_AUDIO_DISABLE") : _("EMULATION_AUDIO_ENABLE"), onclick: () => { nes.audioEnabled = !nes.audioEnabled; } }
					].filter(e => !!e)
				});
			}
		},(state,actions) => h(Box,{ grow: 1, padding: false },[
			h(Menubar,{},[
				h(MenubarItem,{ onclick: ev => actions.menuFile(ev) },_("MENU_FILE")),
				h(MenubarItem,{ onclick: ev => actions.menuEmulation(ev) },_("MENU_EMULATION"))
			]),
			h("div",{ oncreate: el => el.appendChild(canvas) })
		]),$content);
		if(proc.args.file) loadFile(proc.args.file);
	});
	return proc;
};

osjs.register(applicationName,register);
