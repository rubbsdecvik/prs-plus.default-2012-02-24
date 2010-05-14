// Name: Book History
// Description: History of book reading (opening)
// Author: kravitz
//
// History:
//	2010-04-27 kravitz - Initial version
//	2010-04-29 kravitz - Refactored events handling
//	2010-05-01 kravitz - Fixed onSettingsChanged()
//	2010-05-01 kravitz - Added Continue Reading action, fixed minor bugs
//	2010-05-03 kravitz - Renamed from ReadingList, refactored options
//	2010-05-04 kravitz - Fixed doDeleteBook()
//	2010-05-12 kartu - Renamed Continue Reading action to Book History
//	2010-05-14 kravitz - Fixed Book History loading
//	2010-05-14 kravitz - Added Continue Reading action
//	2010-05-14 kravitz - Added option to open the text immediately

tmp = function () {
	// Shortcuts
	var log = Core.log.getLogger("BookHistory");
	var getSoValue = Core.system.getSoValue;
	var getFastBookMedia = Core.system.getFastBookMedia;

	// Localize
	var L = Core.lang.getLocalizer("BookHistory");

	// Default Book History length
	var BH_DEFAULT = 1;

	var CR_TITLE = Core.ui.nodes["continue"].title;
	var BH_TITLE = L("TITLE");
	var BH_FILE = "book.history";

	// This addon
	var BookHistory = {
		name: "BookHistory",
		title: BH_TITLE,
		settingsGroup: "menu",
		optionDefs: [{
			name: "size",
			title: BH_TITLE,
			icon: "CONTINUE",
			defaultValue: String(BH_DEFAULT),
			values:	["1", "3", "5", "10", "20", "30", "40", "50"],
			valueTitles: {
				"1": L("VALUE_DISABLED"),
				"3": L("FUNC_X_BOOKS", 3),
				"5": L("FUNC_X_BOOKS", 5),
				"10": L("FUNC_X_BOOKS", 10),
				"20": L("FUNC_X_BOOKS", 20),
				"30": L("FUNC_X_BOOKS", 30),
				"40": L("FUNC_X_BOOKS", 40),
				"50": L("FUNC_X_BOOKS", 50)
			}
		},
		{
			name: "replace",
			title: L("OPTION_REPLACE"),
			icon: "CONTINUE",
			defaultValue: 1,
			values:	[0, 1],
			valueTitles: {
				0: L("VALUE_OFF"),
				1: L("VALUE_ON")
			}
		},
		{
			name: "through",
			title: L("OPTION_THROUGH"),
			icon: "CONTINUE",
			defaultValue: 1,
			values:	[0, 1],
			valueTitles: {
				0: L("VALUE_MENU"),
				1: L("VALUE_TEXT")
			}
		}],

		actions: [{
			name: "BookHistory",
			title: BH_TITLE,
			group: "Utils",
			icon: "CONTINUE",
			action: function () {
				if (BookHistory.options.size == BH_DEFAULT) {
					// Show current book
					kbook.model.onEnterContinue();
				} else {
					var list = Core.ui.nodes.bookHistory;
					if (list._myconstruct !== undefined) {
						list._myconstruct.apply(list);
					}
					// Show Book History
					kbook.model.onEnterDefault(list);
				}
			}
		},
		{
			name: "ContinueReading",
			title: CR_TITLE,
			group: "Utils",
			icon: "CONTINUE",
			action: function () {
				// Show current book
				kbook.model.onEnterContinue();
			}
		}]
	};

	/**
	 *  @constructor
	 */
	var HistoryBook = function (path, parent) {
		FskCache.tree.xdbNode.construct.call(this);
		this.parent = parent;

		this.enter = function (model, fromParent) {
			try {
				if (fromParent === true) {
					model.onEnterBook(this);
					if (BookHistory.options.through == 1) {
						// Goto the text immediately
						this.nodes[0].enter(model);
					}
				} else {
					model.onEnterDefault(this);
					if (BookHistory.options.through == 1) {
						// Return to Book History
						this.gotoParent(model);
					}
				}
			} catch (e) {
				log.error("enter(): " + e);
			}
		};

		this._nativecomment = (this._myclass) ? this._mycomment : getSoValue(this, "comment");
		this._mycomment = function () {
			if (BookHistory.options.through == 1) {
				return L("PAGE") + " " + (getSoValue(getFastBookMedia(this), "page") + 1);
			} else {
				return this._nativecomment;
			}
		};

		this._bookPath = path;
	};

	/**
	 *  @constructor
	 */
	var HistoryStub = function (path) {
		this._bookPath = path;
	};

	BookHistory.onChangeBook = function (owner) {
		if (this.options.size == BH_DEFAULT) {
			// Book History is disabled
			return;
		}
		var book = owner.currentBook;
		if (book == null) {
			// No book
			return;
		}
		var media = getFastBookMedia(book);
		var source = media.source;
		var bookPath = source.path + media.path;
		var list = Core.ui.nodes.bookHistory;

		// Search current book in history
		for (var i = 0, n = list.nodes.length; i < n; i++) {
			if (list.nodes[i]._bookPath == bookPath) { // ... found
				if (i !== 0) {
					// Move book on top
					list.nodes.unshift(list.nodes.splice(i, 1)[0]);
				}
				return;
			}
		}
		// ... not found - add to history
		HistoryBook.prototype = book;
		var node = new HistoryBook(bookPath, list);
		list.nodes.unshift(node);
		if (list.nodes.length > this.options.size) {
			// Remove last node from history
			node = list.nodes.pop();
			delete node;
		}
	};

	BookHistory.doDeleteBook = function (owner) {
		if (this.options.size == BH_DEFAULT) {
			// Book History is disabled
			return;
		}
		var book = owner.currentBook;
		if (book == null) {
			// No book
			return;
		}
		var media = getFastBookMedia(book);
		var source = media.source;
		var bookPath = source.path + media.path;
		var list = Core.ui.nodes.bookHistory;

		// Search current book in history
		for (var i = 0, n = list.nodes.length; i < n; i++) {
			if (list.nodes[i]._bookPath == bookPath) { // ... found
				// Remove node from history
				delete list.nodes.splice(i, 1)[0];
				break;
			}
		}
	};

	// Locates Book History into Continue Reading or into Games & Utilities
	BookHistory.locate = function () {
		var list = Core.ui.nodes.bookHistory;
		if (this.options.replace == 0) {
			list._myname = BH_TITLE;
			Core.settings.insertAddonNode(list);
			kbook.root.nodes[0] = Core.ui.nodes["continue"];
		} else {
			list._myname = CR_TITLE;
			Core.settings.removeAddonNode(list);
			kbook.root.nodes[0] = list;
		}
	};

	// Remove Book History
	BookHistory.dislocate = function () {
		Core.settings.removeAddonNode(Core.ui.nodes.bookHistory);
		kbook.root.nodes[0] = Core.ui.nodes["continue"];
	};

	BookHistory.onSettingsChanged = function (propertyName, oldValue, newValue) {
		if (oldValue === newValue) {
			return;
		}

		if (propertyName === "size") {
			if (oldValue == BH_DEFAULT) {
				// Add current book history
				this.onChangeBook(kbook.model);
				// Locate histoty
				this.locate();
			} else {
				var list = Core.ui.nodes.bookHistory;
				var node;
				if (this.options.size == BH_DEFAULT) {
					// Change currentBook parent
					node = kbook.model.currentBook;
					if (node && node.parent == list) {
						node.parent = kbook.root;
					}
					// Clean history
					list.nodes = [];
					// Remove histoty
					this.dislocate();
				} else {
					// Adjust history length
					for (var i = 0, n = list.nodes.length - this.options.size; i < n; i++) {
						node = list.nodes.pop();
						delete node;
					}
				}
			}
		}

		if (propertyName === "replace") {
			if (this.options.size != BH_DEFAULT) {
				// Locate histoty
				this.locate();
			}
		}
	};

	// Saves Book History to addon's private file
	BookHistory.saveToFile = function () {
		try {
			FileSystem.ensureDirectory(Core.config.settingsPath);
			var list = Core.ui.nodes.bookHistory;
			var listFile = Core.config.settingsPath + BH_FILE;
			var len = list.nodes.length;

			var current = "";
			for (var i = 0; i < len; i++) {
				current += list.nodes[i]._bookPath + "\r\n";
			}
			if (current.length == 0) {
				// History is empty - delete
				FileSystem.deleteFile(listFile);
				return;
			}
			// Load saved history
			var saved = Core.io.getFileContent(listFile, "");
			if (saved == current) {
				// Lists are equal
				return;
			}
			// ...aren't equal - save
			Core.io.setFileContent(listFile, current);
		} catch (e) {
			log.error("saveToFile(): " + e);
		}
	};


	// Loads saved Book History from addon's private file
	BookHistory.loadFromFile = function () {
		try {
			var list = Core.ui.nodes.bookHistory;
			var listFile = Core.config.settingsPath + BH_FILE;
			if (FileSystem.getFileInfo(listFile)) {
				var stream = new Stream.File(listFile); //FIXME use getFileContent()
				try {
					while (stream.bytesAvailable) {
						// Create stub node
						var node = new HistoryStub(stream.readLine());
						// Add to history
						list.nodes.push(node);
					}
				} finally {
					stream.close();
				}
			}
		} catch (e) {
			log.error("loadFromFile(): " + e);
		}
	};

	BookHistory.onTerminate = function () {
		this.saveToFile();
	};

	BookHistory.onInit = function () {
		// Book History node
		var bookHistoryNode = Core.ui.createContainerNode({
			parent: kbook.root,
			title: CR_TITLE,
			kind: Core.ui.NodeKinds.CONTINUE
		});

		bookHistoryNode.update = function (model) {
			for (var i = 0, n = this.nodes.length; i < n; i++) {
				if (this.nodes[i].update) {
					this.nodes[i].update.call(this.nodes[i], model);
				}
			}
		};

		/**
		 *  @constructor
		 */
		bookHistoryNode._myconstruct = function () {
			var i = 0;
			while (i < this.nodes.length) {
				if (this.nodes[i].parent === undefined) { // Foreach stub ...
					var stub = this.nodes[i];
					var path = stub._bookPath;
					var found = false;
					if (FileSystem.getFileInfo(path)) {
						// Create book node
						var node = _BF_pathToBookNode(path, this);
						if (node) {
							HistoryBook.prototype = node;
							// Replace stub with book
							this.nodes[i] = new HistoryBook(path, this);
							found = true;
						}
					}
					delete stub;
					if (!found) {
						// Book not found - remove node
						delete this.nodes.splice(i, 1)[0];
						continue; // Don't increase counter
					}
				}
				i++;
			}
			delete this._myconstruct; // Called only once
		};

		bookHistoryNode._mycomment = function () {
			return L("FUNC_X_BOOKS", this.length);
		};

		bookHistoryNode.gotoNode = function (node, model) {
			this.exit(model);
			node.lockPath();
			this.unlockPath();
			node.enter(model, true); // Added direction flag
		};

		Core.ui.nodes.bookHistory = bookHistoryNode;

		if (this.options.size != BH_DEFAULT) {
			// Load history
			this.loadFromFile();
			// Locate histoty
			this.locate();
		}
	};

	Core.addAddon(BookHistory);
};

try {
	tmp();
} catch (e) {
	// Core's log
	log.error("in BookHistory.js", e);
}
