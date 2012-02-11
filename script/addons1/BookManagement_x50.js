// Name: BookManagement_x50
// Description: Allows to set 'new' flag manually, to hide default collections,
//				to show reading progress in home menu and thumbnail views
//				and to customize home menu booklist
// 
// Author: quisvir
//
// History:
//	2011-08-29 quisvir - Initial version
//	2011-08-31 quisvir - Avoid assets.xml and change terminology
//	2011-09-04 Mark Nord - preserve Add-Collection, added icons
//	2011-09-05 quisvir - Extend Hide Collection options to 1 option per collection entry
//	2011-09-05 quisvir - Add reading progress in home menu and thumbnail views
//	2011-09-08 quisvir - Format options now correspond to statusbar options, and fewer strings needed
//	2011-09-09 quisvir - Added exception for reading progress in thumbnail checkbox view
//	2011-09-10 quisvir - Reading Progress: Fixed menu lockups in views other than books
//	2011-09-12 quisvir - Added Home Menu Booklist customization
//	2011-09-14 quisvir - Fixed Booklist bug on searching history (thanks MiK77)
//	2011-09-14 quisvir - Fixed bug in Reading Progress if there is no current book
//	2011-09-15 quisvir - Fixed bug where booklist wasn't correct after startup (via workaround)
//	2011-09-16 quisvir - More bugfixes, booklist partly rewritten
//	2011-09-18 quisvir - Rename to BookManagement_x50, booklist speed improvements, add random booklist option
//	2011-09-20 quisvir - Use PRS+ book history instead of cache for 'last opened books' booklist
//	2011-09-22 quisvir - Display current booklist option in home menu
//	2011-09-27 quisvir - Add ability to cycle through collections for 'next in collection' booklist
//	2011-09-28 quisvir - Display current collection in home menu, add option to ignore memory cards
//	2011-10-04 quisvir - Add option to treat periodicals as books
//	2011-11-20 quisvir - Added sub-collection support (max 1 sub-level, using | as separator)
//	2011-11-25 quisvir - Added booklist option 'Select Collection' & action
//	2011-12-04 quisvir - Split cycle booklist action into cycle forward & backward actions
//  2011-12-04 Ben Chenoweth - Added "Next/Previous Books In History" actions
//  2011-12-05 Ben Chenoweth - Reset "Last Opened Books" when new book selected
//	2011-12-07 quisvir - Cosmetic changes
//	2011-12-11 quisvir - Extended 'Next/Previous Books' to all booklist options
//	2011-12-12 quisvir - Changed booklist construct to check numCurrentBook right away; various changes
//	2011-12-15 quisvir - Added Notepads filter to home menu booklist; code cleaning
//	2011-12-25 quisvir - Added option for booklist arrows in home menu
//	2011-12-26 quisvir - Fixed booklist cycle backward action for 'next in collection'
//	2012-01-02 quisvir - Added 'Read Books' collection
//	2012-01-10 Ben Chenoweth - Added default keybindings for HOME MENU context
//	2012-01-19 quisvir - Added 'Add to Collection' option in Book Option Menu
//	2012-02-07 quisvir - Performance tweaks: made filtering notepads optional, added modulus code by drMerry
//	2012-02-10 quisvir - Optimised most of the code, with help from drMerry
//	2012-02-11 quisvir - Added options: page buttons in home menu, use sub-collections, mark all books read/unread, clear history on shutdown
//
//	TODO:
//	Move 'Set/Remove New Flag' and 'Add to Collection' options to PRS+ popup menu

tmp = function() {

	var L, LX, log, opt, bookChanged, trigger1, trigger2, trigger3, trigger4, tempNode, oldNode, numCur, holdKey, model, devRoot, thumbnailsNode, homeSandbox, constructRun;
	
	L = Core.lang.getLocalizer('BookManagement');
	LX = Core.lang.LX;
	log = Core.log.getLogger('BookManagement');
	
	// Some useful references
	model = kbook.model;
	devRoot = kbook.root.children.deviceRoot;
	thumbnailsNode = kbook.root.nodes[0].nodes[6];
	homeSandbox = model.container.sandbox.MENU_HOME_GROUP.sandbox;
	
	numCur = 0;
	holdKey = false;
	
	// Treat Periodicals as Books	
	var oldIsPeriodical = FskCache.text.isPeriodical;
	FskCache.text.isPeriodical = function () {
		if (opt.PeriodicalsAsBooks === 'true') {
			return false;
		} else {
			return oldIsPeriodical.apply(this, arguments);
		}
	}
	
	var oldIsNewspaper = FskCache.text.isNewspaper;
	FskCache.text.isNewspaper = function () {
		if (opt.PeriodicalsAsBooks === 'true') {
			return false;
		} else {
			return oldIsNewspaper.apply(this, arguments);
		}
	}
	
	var oldOnEnterShortCutBook = model.onEnterShortCutBook;
	model.onEnterShortCutBook = function (node) {
		if (opt.PeriodicalsAsBooks === 'true' && node.periodicalName) {
			this.currentNode.gotoNode(node, this);
		} else {
			oldOnEnterShortCutBook.apply(this, arguments);
		}
	};
	
	// Keep new flag as is on opening book
	var oldOnChangeBook = model.onChangeBook;
	model.onChangeBook = function (node) {
		var newflag = node.opened;
		if (this.currentBook) {
			opt.CurrentCollection = '';
		}
		oldOnChangeBook.apply(this, arguments);
		if (opt.ManualNewFlag === 'true') {
			node.opened = newflag;
		}
		if (this.STATE !== 'MENU_HOME') {
			bookChanged = true; // exception for current book on startup
		}
		numCur = 0;
	}
	
	// Book menu option to switch new flag, called from main.xml
	model.container.sandbox.OPTION_OVERLAY_PAGE.sandbox.NewFlagToggle = function () {
		var book = model.currentBook;
		this.doOption();
		book.opened = !book.opened;
	}
	
	// Book menu option to add book to collection, called from main.xml
	model.container.sandbox.OPTION_OVERLAY_PAGE.sandbox.AddToCollection = function () {
		this.doOption();
		doSelectCollection('book');
	}
	
	// Show book menu option if preference is set
	kbook.optMenu.isDisable = function (part) {
		var p = part.playing;
		if (p.indexOf('manualnewflag') !== -1) {
			if (opt.ManualNewFlag === 'false') {
				return true;
			}
			part.text = (model.currentBook.opened) ? L('SETNEWFLAG') : L('REMOVENEWFLAG');
		} else if (p.indexOf('addtocollection') !== -1 && opt.showAddToCollection === 'false') {
			return true;
		}
		return Fskin.overlayTool.isDisable(part);
	}

	// Hide default collections
	var oldKbookPlaylistNode = kbook.root.kbookPlaylistNode.construct;
	kbook.root.kbookPlaylistNode.construct = function () {
		oldKbookPlaylistNode.apply(this, arguments);
		var node, nodes, c, p;
		nodes = this.nodes;
		c = p = 0;
		if (opt.HideAddNewCollection === 'true') {
			nodes.splice(3, 1);
			c++;
		}
		if (opt.HidePurchasedBooks === 'true') {
			nodes.splice(2, 1);
			c++; p++;
		}
		if (opt.HideUnreadPeriodicals === 'true') {
			nodes.splice(1, 1);
			c++; p++;
		}
		if (opt.HideUnreadBooks === 'true') {
			nodes.splice(0, 1);
			c++; p++;
		}
		if (opt.addReadBooks === 'true') {
			node = xs.newInstanceOf(kbook.root.kbookUnreadBooksListNode);
			node.cache = this.cache;
			node.parent = this;
			node.depth = this.depth + 1;
			node.name = node.title = L('READ_BOOKS');
			node.filter = function (result) {
				var i, record;
				for (i = result.count() - 1; i >= 0; i--) {
					record = result.getRecord(i);
					if (!record.opened || record.periodicalName) {
						result.removeID(result.getID(i));
					}
				}
				return result;
			};
			node.locked++;
			nodes.unshift(node);
			node.construct();
			c--; p--;
		}
		this.constNodesCount -= c;
		this.presetItemsCount -= p;
		createSubCollections(nodes, this, this.constNodesCount);
	}

	var createSubCollections = function (nodes, parent, next) {
		if (opt.subCollections === 'false') return;
		var i, node, newNode, last, idx, coll, title;
		i = next;
		c = nodes.length;
		while (i < c) {
			node = nodes[i];
			title = node.title;
			idx = title.indexOf('|');
			if (idx !== -1) {
				node.name = node.title = title.slice(idx + 1);
				coll = title.slice(0, idx);
				if (last === coll) {
					node.parent = nodes[next-1];
					nodes[next-1].nodes.push(nodes.splice(i,1)[0]);
					i--; c--;
				} else {
					newNode = Core.ui.createContainerNode({
						title: coll,
						comment: function () {
							return Core.lang.LX('COLLECTIONS', this.nodes.length);
						},
						parent: parent,
						icon: 'BOOKS'
					});
					node.parent = newNode;
					newNode.sublistMark = true;
					newNode.nodes.push(nodes.splice(i,1)[0]);
					nodes.splice(next, 0, newNode);
					last = coll;
					next++;
				}
			}
			i++;
		}
		if (last) nodes[next-1].separator = 1;
	}
	
	// Draw reading progress instead of 'last read' date/time
	model.getContinueDate = function (node) {
		var cb, media, page, pages;
		cb = this.currentBook;
		if (cb && opt.readingProgressCurrent === 'true') {
			media = cb.media;
			page = media.currentPosition.page + 1;
			if (page >= parseInt(opt.OnlyShowFromPage)) {
				pages = media.history[0].pages;
				return readingProgressComment(page, pages, opt.progressFormatCurrent);
			}
		}
		return node.nodes[0].lastReadDate;
	}
	
	// Draw reading progress below thumbnails
	var oldDrawRecord = Fskin.kbookViewStyleThumbnail.drawRecord;
	Fskin.kbookViewStyleThumbnail.drawRecord = function (offset, x, y, width, height, tabIndex, parts) {
		oldDrawRecord.apply(this, arguments);
		if (!constructRun) return;
		
		var win, menu, home, list, record, media, page, pages, msg, n, comX, comY, comWidth, comHeight;
		win = this.getWindow();
		menu = this.menu;
		comHeight = this.textCommentHeight;
		
		if (xs.isInstanceOf(model.currentNode, devRoot)) {
			// Display current booklist option text
			home = true;
			if (offset === 2) {
				list = opt.BookList;
				if (list === 4) {
					msg = opt.SelectedCollection;
				} else if (list === 3 && opt.CurrentCollection) {
					msg = L('NEXT_IN') + ' ' + opt.CurrentCollection;
				} else {
					msg = BookManagement_x50.optionDefs[0].optionDefs[0].valueTitles[list];
				}
				// Replace | with : for sub-collections
				if (opt.subCollections === 'true') msg = msg.replace('|',': ');
				// Add position in current booklist
				n = thumbnailsNode.nodes.length;
				if (n > 1) {
					msg += ' (' + (numCur + 1) + '-' + (numCur + n) + ')';
				} else if (n === 1) {
					msg += ' (' + (numCur + 1) + ')';
				}
				this.skin.styles[6].draw(win, msg, 0, y-25, this.width, comHeight);
			}
		}
		
		switch (opt.readingProgressThumbs) {
			case 'false':
				return;
			case 'home':
				if (!home) return;
			case 'all':
				record = menu.getRecord(offset);
				if (!record || record.kind !== 2) return;
				media = record.media;
				if (!media.history.length || (this.statusVisible && (media.sourceid > 1 || menu.getFixSelectPosition() || record.expiration))) {
					return;
				}
				page = media.currentPosition.page + 1;
				if (page < parseInt(opt.OnlyShowFromPage)) return;
				pages = media.history[0].pages;
				msg = readingProgressComment(page, pages, opt.progressFormatThumbs);
				comX = x + this.marginWidth;
				comY = this.getNy(this.getTy(y), Math.min(this.getTh(height), this.thumbnailHeight)) + this.textNameHeight + this.marginNameAndComment + 23;
				comWidth = this.getCw(width, Fskin.scratchRectangle.width);
				parts.commentStyle.draw(win, msg, comX, comY, comWidth, comHeight);
		}
	};
	
	// Format reading progress comment
	readingProgressComment = function (page, pages, format) {
		switch (format) {
			case '1': return L('PAGE') + ' ' + page + ' ' + L('OF') + ' ' + pages;
			case '2': return L('PAGE') + ' ' + page + ' ' + L('OF') + ' ' + pages + ' (' + Math.floor((page/pages)*100) + '%)';
			case '3': return page + ' ' + L('OF') + ' ' + pages;
			case '4': return page + ' ' + L('OF') + ' ' + pages + ' (' + Math.floor((page/pages)*100) + '%)';
			case '5': return Math.floor((page/pages)*100) + '%';
			case '6': return page + ' / ' + pages;
			case '7': return page + ' / ' + pages + ' (' + Math.floor((page/pages)*100) + '%)';
			case '8': return L('PAGE') + ' ' + page + ' / ' + pages + ' (' + Math.floor((page/pages)*100) + '%)';
		}
	}

	// Update deviceroot on enter
	var oldOnEnterDeviceRoot = model.onEnterDeviceRoot;
	model.onEnterDeviceRoot = function () {
		if (bookChanged) {
			// Don't update if opt = 0 and no trigger has been used
			if (opt.BookList || trigger1 || trigger2 || trigger3 || trigger4) {
				thumbnailsNode.update(this);
			}
			bookChanged = false;
		}
		oldOnEnterDeviceRoot.apply(this, arguments);
	}
	
	// Update booklist after collection edit
	var oldFinishCollectionEdit = model.finishCollectionEdit;
	model.finishCollectionEdit = function () {
		var i, node, change, current, kind, items;
		node = this.colManTgtNode;
		if (node && opt.BookList > 2) {
			current = opt.CurrentCollection ? opt.CurrentCollection : opt.SelectedCollection;
			kind = node.kind;
			if (kind === 42 && node.title === current) {
				change = true;
			} else if (kind === 17) {
				items = this.colManItems;
				for (i = items.length - 1; i >= 0; i--) {
					if (items[i].title === current) {
						change = true;
						break;
					}
				}
			}
			if (change) {
				bookChanged = true;
				opt.CurrentCollection = '';
				numCur = 0;
			}
		}
		oldFinishCollectionEdit.apply(this, arguments);
	}
	
	var updateBookList = function () {
		if (xs.isInstanceOf(model.currentNode, devRoot)) {
			thumbnailsNode.update(model);
			kbook.menuHomeThumbnailBookData.setNode(thumbnailsNode);
		} else {
			bookChanged = true;
		}
	}
	
	// Filter notepads & periodicals for home menu booklist
	devRoot.children.bookThumbnails.filter = devRoot.children.books.filter = function (result) {
		var i, book;
		if (opt.PeriodicalsAsBooks === 'false') {
			if (opt.hideNotepads === 'false') {
				// Filter periodicals only (default behaviour)
				for (i = result.count() - 1; i >= 0; i--) {
					book = result.getRecord(i);
					if (book.periodicalName) {
						result.removeID(book.id);
					}
				}
			} else {
				// Filter periodicals and notepads
				for (i = result.count() - 1; i >= 0; i--) {
					book = result.getRecord(i);
					if (book.periodicalName || book.path.slice(0,9) === 'Notepads/') {
						result.removeID(book.id);
					}
				}
			}
		} else if (opt.hideNotepads === 'true') {
			// Filter notepads only
			for (i = result.count() - 1; i >= 0; i--) {
				book = result.getRecord(i);
				if (book.path.slice(0,9) === 'Notepads/') {
					result.removeID(book.id);
				}
			}
		}
		return result;
	}
	
	// Customize book list in home menu
	devRoot.children.bookThumbnails.construct = function () {
		var prototype, nodes, cache, db, db2, current, c, node,
			i, j, hist, book, books, id, id2, items, author, list, coll, colls;
		FskCache.tree.xdbNode.construct.call(this);
		constructRun = true;
		cache = this.cache;
		prototype = this.prototype;
		nodes = this.nodes = [];
		if (opt.IgnoreCards === 'true') {
			db = cache.getSourceByName('mediaPath').textMasters;
		} else {
			db = cache.textMasters;
		}
		db = this.filter(db);
		c = db.count();
		if (!c) return;
		if (model.currentBook) {
			current = model.currentBook.media;
		} else if (model.currentPath) {
			db2 = db.db.search('indexPath',model.currentPath); // FIXME only do this lookup if actually needed
			if (db2.count()) {
				current = db2.getRecord(0);
			}
		}
		while (true) {
			switch (opt.BookList) {
				case 0: // Last added books
					db.sort_c({
						by: 'indexDate',
						order: xdb.descending
					});
					if (numCur && numCur >= c) {
						numCur -= 3;
					}
					for (i = numCur; nodes.length < 3 && i < c; i++) {
						node = nodes[nodes.length] = xs.newInstanceOf(prototype);
						node.cache = cache;
						node.media = db.getRecord(i);
					}
					break;
				case 1: // Last opened books
					hist = Core.addonByName.BookHistory.getBookList();
					j = (current) ? 1 : 0; // FIXME incorrect if periodical?
					if (numCur && numCur + j >= hist.length) {
						numCur -= 3;
					}
					books = hist.length;
					for (i = numCur + j; nodes.length < 3 && i < books; i++) {
						book = Core.media.findMedia(hist[i]);
						if (book) {
							if (book.periodicalName && opt.PeriodicalsAsBooks === 'false') {
								continue; // FIXME numCur -= 3 goes wrong here
							}
							node = nodes[nodes.length] = xs.newInstanceOf(prototype);
							node.cache = cache;
							node.media = book;
						}
					}
					break;
				case 2: // Books by same author
					if (!current) break;
					id = current.id;
					author = current.author;
					if (!author) break;
					list = [];
					// Find other books by same author, excluding current book
					for (i = 0; i < c; i++) {
						book = db.getRecord(i);
						if (book.author === author && book.id !== id) {
							list.push(i);
						}
					}
					books = list.length;
					if (numCur && numCur >= books) {
						numCur -= 3;
					}
					for (i = numCur; nodes.length < 3 && i < books; i++) {
						node = nodes[nodes.length] = xs.newInstanceOf(prototype);
						node.cache = cache;
						node.media = db.getRecord(list[i]);
					}
					break;
				case 3: // Next books in collection
					if (!current) break;
					id = current.id;
					i = 0;
					// Switch to collections cache
					db2 = cache.playlistMasters;
					db2.sort('indexPlaylist');
					colls = db2.count();
					if (opt.CurrentCollection) {
						for (i = 0; i < colls && db2.getRecord(i).title !== opt.CurrentCollection; i++);
						if (i === colls) {
							// CC not found, so start from beginning
							i = 0;
						} else if (trigger1) {
							// CC found, but trigger1 used, so start from next
							i++;
						}
					}
					if (trigger2) {
						i = (i === 0) ? colls - 1 : i - 1;
					}
					while (i >= 0 && i < colls) {
						coll = db2.getRecord(i);
						books = coll.count();
						j = coll.getItemIndex(id) + 1;
						if (j && j < books) {
							// Current book found in collection where it's not the last book
							if (numCur && numCur + j >= books) {
								numCur -= 3;
							}
							for (j += numCur; nodes.length < 3 && j < books; j++) {
								node = nodes[nodes.length] = xs.newInstanceOf(prototype);
								node.cache = cache;
								node.media = cache.getRecord(coll.items[j].id);
							}
							break;
						}
						i = (trigger2) ? i - 1 : i + 1;
					}
					opt.CurrentCollection = (nodes.length) ? coll.title : '';
					break;
				case 4: // Select collection
					if (!opt.SelectedCollection) break;
					books = [];
					if (current) {
						id = current.id;
					}
					db2 = cache.playlistMasters.db.search('indexPlaylist', opt.SelectedCollection);
					if (!db2.count()) break;
					// Selected Collection found
					items = db2.getRecord(0).items;
					j = items.length;
					for (i = 0; i < j; i++) { // FIXME no need to list all books in advance
						id2 = items[i].id;
						if (id2 !== id) {
							books.push(id2);
						}
					}
					j = books.length;
					if (numCur && numCur >= j) {
						numCur -= 3;
					}
					for (i = numCur; nodes.length < 3 && i < j; i++) {
						node = nodes[nodes.length] = xs.newInstanceOf(prototype);
						node.cache = cache;
						node.media = cache.getRecord(books[i]);
					}
			}
			if (!nodes.length) {
				if (trigger1) {
					opt.BookList = (opt.BookList + 1) % 5;
					continue;
				} else if (trigger2) {
					opt.BookList = (opt.BookList + 4) % 5;
					continue;
				}
			}
			trigger1 = trigger2 = trigger3 = trigger4 = false;
			break;
		}
	};
	
	// PREV/NEXT on HOME MENU activate BooklistPrev/NextBooks
	homeSandbox.doPrevious = function () {
		if (!holdKey) {
			BookManagement_x50.actions[3 - opt.homeMenuPageButtons].action();
		} else {
			holdKey = false;
		}
	}
	
	homeSandbox.doNext = function () {
		if (!holdKey) {
			BookManagement_x50.actions[2 - opt.homeMenuPageButtons].action();
		} else {
			holdKey = false;
		}
	}

	// HOLD PREV/HOLD NEXT on HOME MENU activate BooklistCycleBackward/Forward
	homeSandbox.doPreviousHold = function () {
		holdKey = true;
		BookManagement_x50.actions[1 + opt.homeMenuPageButtons].action();
	}
	
	homeSandbox.doNextHold = function () {
		holdKey = true;
		BookManagement_x50.actions[opt.homeMenuPageButtons].action();
	}
	

	// Functions for booklist option 'Select Collection'
	var doSelectCollection = function (target) {
		if (target === 'book' && !model.currentBook) return;
		oldNode = model.currentNode;
		oldNode.redirect = true;
		tempNode = Core.ui.createContainerNode({
			title: L('SELECT_COLLECTION'),
			parent: oldNode,
			construct: selectCollectionConstruct,
			destruct: selectCollectionDestruct
		});
		tempNode.target = target;
		oldNode.gotoNode(tempNode, model);
	}
	
	var selectCollectionConstruct = function () {
		var i, node, nodes, db, c;
		nodes = this.nodes = [];
		db = model.cache.playlistMasters;
		db.sort('indexPlaylist');
		c = db.count();
		for (i = 0; i < c; i++) {
			coll = db.getRecord(i);
			node = nodes[i] = Core.ui.createContainerNode({
				title: coll.title,
				comment: LX('BOOKS', db.getRecord(i).count()),
				icon: 'BOOKS'
			});
			node.onEnter = 'collectionSelected';
			node.coll = coll;
			node.oldNode = oldNode;
			node.target = this.target;
		}
		createSubCollections(nodes, this, 0);
	}
	
	var selectCollectionDestruct = function () {
		tempNode = null;
		delete oldNode.redirect;
		oldNode = null;
	}
	
	model.collectionSelected = function (node) {
		var old, coll, id;
		old = node.oldNode;
		coll = node.coll;
		switch (node.target) {
			case 'book':
				id = this.currentBook.media.id;
				if (coll.getItemIndex(id) !== -1) {
					coll.append(id);
					this.cache.updateRecord(coll.id, coll);
				}
				break;
			case 'booklist':
				opt.BookList = 4;
				opt.SelectedCollection = coll.title;
				Core.settings.saveOptions(BookManagement_x50);
				updateBookList();
				if (old.title === L('BOOK_SELECTION')) {
					old = old.parent;
				}
		}
		this.currentNode.gotoNode(old, this);
	}
	
	// Link actions to home menu booklist arrows
	model.container.sandbox.booklistArrows = function (index) {
		BookManagement_x50.actions[4 - index].action();
	};
	
	// Mark all books as read/unread (uses books node to avoid periodicals)
	var markAllBooks = function (read) {
		var n, i;
		n = kbook.root.getBooksNode().nodes;
		for (i = n.length - 1; i >= 0; i--) {
			n[i].media.opened = read;
		}
		kbook.root.update(model);
	}
	
	// Clear page histories, keeping current position (length = 0 crashes home menu)
	var clearPageHists = function () {
		var db, i, r;
		if (opt.clearHistsOnShutdown === 'true') {
			db = model.cache.textMasters;
			for (i = db.count() - 1; i >= 0; i--) {
				r = db.getRecord(i);
				if (r.history.length) r.history.length = 1;
			}
		}
	}
	
	var BookManagement_x50 = {
		name: 'BookManagement_x50',
		title: L('TITLE'),
		icon: 'BOOKS',
		onInit: function () {
			opt = this.options;
			// Workaround for numerical settings being saved as strings
			opt.BookList = parseInt(opt.BookList);
			opt.homeMenuPageButtons = parseInt(opt.homeMenuPageButtons);
			Core.events.subscribe(Core.events.EVENTS.SHUTDOWN, clearPageHists, true);
		},
		actions: [{
			name: 'BookListCycleForward',
			title: L('BOOKLIST_CYCLE_FORWARD'),
			group: 'Other',
			icon: 'BOOKS',
			action: function () {
				var list = opt.BookList;
				trigger1 = true;
				numCur = 0;
				if (list === 4) {
					opt.BookList = 0;
				} else if (list !== 3) {
					opt.BookList++;
					opt.CurrentCollection = '';
				}
				updateBookList();
				Core.settings.saveOptions(BookManagement_x50);
			}
		},
		{
			name: 'BookListCycleBackward',
			title: L('BOOKLIST_CYCLE_BACKWARD'),
			group: 'Other',
			icon: 'BOOKS',
			action: function () {
				var list = opt.BookList;
				trigger2 = true;
				numCur = 0;
				if (!list) {
					opt.BookList = 4;
				} else if (list !== 3) {
					opt.BookList--;
					opt.CurrentCollection = '';
				}
				updateBookList();
				Core.settings.saveOptions(BookManagement_x50);
			}
		},
		{
			name: 'BookListNextBooks',
			title: L('BOOKLIST_NEXT_BOOKS'),
			group: 'Other',
			icon: 'NEXT',
			action: function () {
				if (bookChanged) {
					model.doBlink();
				} else {
					numCur += 3;
					trigger3 = true;
					updateBookList();
				}
			}
		},
		{
			name: 'BookListPreviousBooks',
			title: L('BOOKLIST_PREVIOUS_BOOKS'),
			group: 'Other',
			icon: 'NEXT',
			action: function () {
				if (numCur < 3 || bookChanged) {
					model.doBlink();
				} else {
					numCur -= 3;
					trigger4 = true;
					updateBookList();
				}
			}
		},
		{
			name: 'BookListSelectCollection',
			title: L('BOOKLIST_SELECT_COLLECTION'),
			group: 'Other',
			icon: 'BOOKS',
			action: function () {
				doSelectCollection('booklist');
			}
		}],
		optionDefs: [
			{
			groupTitle: L('CUSTOMIZE_HOME_MENU_BOOKLIST'),
			groupIcon: 'BOOKS',
			optionDefs: [
			{
				name: 'BookList',
				title: L('BOOK_SELECTION'),
				icon: 'BOOKS',
				defaultValue: '0',
				values: ['0', '1', '2', '3', '4'],
				valueTitles: {
					'0': L('LAST_ADDED_BOOKS'),
					'1': L('LAST_OPENED_BOOKS'),
					'2': L('BOOKS_BY_SAME_AUTHOR'),
					'3': L('NEXT_BOOKS_IN_COLLECTION'),
					'4': L('SELECT_COLLECTION') + '...'
				}
			},
			{
				name: 'IgnoreCards',
				title: L('IGNORE_MEMORY_CARDS'),
				icon: 'DB',
				defaultValue: 'false',
				values: ['true','false'],
				valueTitles: {
					'true': L('VALUE_TRUE'),
					'false': L('VALUE_FALSE')
				}
			},
			{
				name: 'homeMenuArrows',
				title: L('SHOW_HOME_MENU_ARROWS'),
				icon: 'PLAY',
				defaultValue: 'false',
				values: ['true', 'false'],
				valueTitles: {
					'true': L('VALUE_TRUE'),
					'false': L('VALUE_FALSE')
				}
			},
			{
				name: 'homeMenuPageButtons',
				title: L('HOME_MENU_PAGE_BUTTONS'),
				icon: 'SETTINGS',
				defaultValue: '0',
				values: ['0', '2'],
				valueTitles: {
					'0': L('PRESS_SCROLL_HOLD_SWITCH'),
					'2': L('PRESS_SWITCH_HOLD_SCROLL'),
				}
			}]},
			{
			groupTitle: L('SHOW_READING_PROGRESS'),
			groupIcon: 'BOOKMARK',
			optionDefs: [
				{
				name: 'readingProgressCurrent',
				title: L('SHOW_READING_PROGRESS_CURRENT'),
				icon: 'BOOKMARK',
				defaultValue: 'false',
				values: ['true','false'],
				valueTitles: {
					'true': L('VALUE_TRUE'),
					'false': L('VALUE_FALSE')
				}
				},
				{
				name: 'progressFormatCurrent',
				title: L('PROGRESS_FORMAT_CURRENT'),
				icon: 'SETTINGS',
				defaultValue: '2',
				values: ['1', '2', '3', '4', '5', '6', '7', '8'],
				valueTitles: {
					'1': L('PAGE') + ' 5 ' + L('OF') + ' 100',
					'2': L('PAGE') + ' 5 ' + L('OF') + ' 100 (5%)',
					'3': '5 ' + L('OF') + ' 100',
					'4': '5 ' + L('OF') + ' 100 (5%)',
					'5': '5%',
					'6': '5 / 100',
					'7': '5 / 100 (5%)',
					'8': L('PAGE') + ' 5 / 100 (5%)'
				}
				},
				{
				name: 'readingProgressThumbs',
				title: L('SHOW_READING_PROGRESS_THUMBS'),
				icon: 'BOOKMARK',
				defaultValue: 'false',
				values: ['all', 'home', 'false'],
				valueTitles: {
					'all': L('ALL_THUMBNAIL_VIEWS'),
					'home': L('HOME_MENU_ONLY'),
					'false': L('VALUE_FALSE')
				}
				},
				{
				name: 'progressFormatThumbs',
				title: L('PROGRESS_FORMAT_THUMBS'),
				icon: 'SETTINGS',
				defaultValue: '3',
				values: ['1', '2', '3', '4', '5', '6', '7', '8'],
				valueTitles: {
					'1': L('PAGE') + ' 5 ' + L('OF') + ' 100',
					'2': L('PAGE') + ' 5 ' + L('OF') + ' 100 (5%)',
					'3': '5 ' + L('OF') + ' 100',
					'4': '5 ' + L('OF') + ' 100 (5%)',
					'5': '5%',
					'6': '5 / 100',
					'7': '5 / 100 (5%)',
					'8': L('PAGE') + ' 5 / 100 (5%)'
				}
				},
				{
				name: 'OnlyShowFromPage',
				title: L('ONLY_SHOW_FROM_PAGE'),
				icon: 'SETTINGS',
				defaultValue: '2',
				values: ['1', '2', '3', '4', '5', '10', '15', '20', '25', '50'],
				},
			]},
			{
			groupTitle: L('COLLECTIONS'),
			groupIcon: 'BOOKS',
			optionDefs: [
				{
					name: 'addReadBooks',
					title: L('ADD_READ_BOOKS_COLLECTION'),
					icon: 'BOOKS',
					defaultValue: 'false',
					values: ['true','false'],
					valueTitles: {
						'true': L('VALUE_TRUE'),
						'false': L('VALUE_FALSE')
					}
				},
				{
					name: 'HideUnreadBooks',
					title: L('HIDE_UNREAD_BOOKS'),
					icon: 'BOOKS',
					defaultValue: 'false',
					values: ['true','false'],
					valueTitles: {
						'true': L('VALUE_TRUE'),
						'false': L('VALUE_FALSE')
					}
				},
				{
					name: 'HideUnreadPeriodicals',
					title: L('HIDE_UNREAD_PERIODICALS'),
					icon: 'BOOKS',
					defaultValue: 'false',
					values: ['true','false'],
					valueTitles: {
						'true': L('VALUE_TRUE'),
						'false': L('VALUE_FALSE')
					}
				},
				{
					name: 'HidePurchasedBooks',
					title: L('HIDE_PURCHASED_BOOKS'),
					icon: 'BOOKS',
					defaultValue: 'false',
					values: ['true','false'],
					valueTitles: {
						'true': L('VALUE_TRUE'),
						'false': L('VALUE_FALSE')
					}
				},
				{
					name: 'HideAddNewCollection',
					title: L('HIDE_ADD_NEW_COLLECTION'),
					icon: 'BOOKS',
					defaultValue: 'false',
					values: ['true','false'],
					valueTitles: {
						'true': L('VALUE_TRUE'),
						'false': L('VALUE_FALSE')
					}
				},
				{
					name: 'subCollections',
					title: L('USE_SUB_COLLECTIONS'),
					icon: 'BOOKS',
					defaultValue: 'false',
					values: ['true','false'],
					valueTitles: {
						'true': L('VALUE_TRUE'),
						'false': L('VALUE_FALSE')
					}
				}
			]},
			{
				name: 'PeriodicalsAsBooks',
				title: L('TREAT_PERIODICALS_AS_BOOKS'),
				icon: 'PERIODICALS',
				defaultValue: 'false',
				values: ['true', 'false'],
				valueTitles: {
					'true': L('VALUE_TRUE'),
					'false': L('VALUE_FALSE')
				}	
			},
			{
				name: 'hideNotepads',
				title: L('HIDE_SAVED_NOTEPADS'),
				icon: 'TEXT_MEMO',
				defaultValue: 'false',
				values: ['true','false'],
				valueTitles: {
					'true': L('VALUE_TRUE'),
					'false': L('VALUE_FALSE')
				}
			},
			{
				name: 'ManualNewFlag',
				title: L('SET_NEW_FLAG_MANUALLY'),
				icon: 'NEW',
				defaultValue: 'false',
				values: ['true', 'false'],
				valueTitles: {
					'true': L('VALUE_TRUE'),
					'false': L('VALUE_FALSE')
				}	
			},
			{
				name: 'markAllBooks',
				title: L('MARK_ALL_BOOKS_READ_UNREAD'),
				icon: 'NEW',
				defaultValue: '',
				noCheck: true,
				values: ['read', 'unread'],
				valueTitles: {
					'read': L('MARK_ALL_BOOKS_READ'),
					'unread': L('MARK_ALL_BOOKS_UNREAD')
				}
			},
			{
				name: 'showAddToCollection',
				title: L('SHOW_ADD_TO_COLLECTION'),
				icon: 'BOOKS',
				defaultValue: 'false',
				values: ['true', 'false'],
				valueTitles: {
					'true': L('VALUE_TRUE'),
					'false': L('VALUE_FALSE')
				}	
			},
			{
				name: 'clearHistsOnShutdown',
				title: L('CLEAR_PAGE_HISTORY_ON_SHUTDOWN'),
				icon: 'CLOCK',
				defaultValue: 'false',
				values: ['true', 'false'],
				valueTitles: {
					'true': L('VALUE_TRUE'),
					'false': L('VALUE_FALSE')
				}	
			},
			{
				name: 'CurrentCollection',
				defaultValue: '',
				hidden: 'true',
			},
			{
				name: 'SelectedCollection',
				defaultValue: '',
				hidden: 'true',
			},
		],
		onSettingsChanged: function (propertyName, oldValue, newValue, object) {
			numCur = 0;
			switch (propertyName) {
				case 'homeMenuArrows':
					Core.config.homeMenuArrows = newValue;
					kbook.root.getDeviceRootNode().update(model);
					break;
				case 'homeMenuPageButtons':
					opt.homeMenuPageButtons = parseInt(newValue);
					break;
				case 'BookList':
					opt.BookList = parseInt(newValue);
					if (newValue === '4') doSelectCollection('booklist');
				case 'IgnoreCards':
				case 'hideNotepads':
					opt.CurrentCollection = '';
				case 'PeriodicalsAsBooks':
					updateBookList(); // FIXME last 2 options don't work if it means the filter gets turned off, if IgnoreCards is enabled
					break;
				case 'markAllBooks':
					markAllBooks(newValue === 'read');
					opt.markAllBooks = '';
			}
		}
	};

	Core.addAddon(BookManagement_x50);
};
try {
	tmp();
} catch (e) {
	// Core's log
	log.error('in BookManagement.js', e);
}
