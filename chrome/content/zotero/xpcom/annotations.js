/*
    ***** BEGIN LICENSE BLOCK *****
    
    Copyright © 2020 Corporation for Digital Scholarship
                     Vienna, Virginia, USA
                     https://www.zotero.org
    
    This file is part of Zotero.
    
    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    
    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    
    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
    
    ***** END LICENSE BLOCK *****
*/

"use strict";

Zotero.Annotations = new function () {
	// Keep in sync with items.js::loadAnnotations()
	Zotero.defineProperty(this, 'ANNOTATION_TYPE_HIGHLIGHT', { value: 1 });
	Zotero.defineProperty(this, 'ANNOTATION_TYPE_NOTE', { value: 2 });
	Zotero.defineProperty(this, 'ANNOTATION_TYPE_IMAGE', { value: 3 });
	
	
	this.toJSON = function (item) {
		var o = {};
		o.key = item.key;
		o.type = item.annotationType;
		o.isAuthor = !item.createdByUserID || item.createdByUserID == Zotero.Users.getCurrentUserID();
		if (!o.isAuthor) {
			o.authorName = Zotero.Users.getName(item.createdByUserID);
		}
		if (o.type == 'highlight') {
			o.text = item.annotationText;
		}
		else if (o.type == 'image') {
			o.imageURL = item.annotationImageURL;
		}
		o.comment = item.annotationComment;
		o.pageLabel = item.annotationPageLabel;
		o.color = item.annotationColor;
		o.sortIndex = item.annotationSortIndex;
		o.position = item.annotationPosition;
		
		// Add tags and tag colors
		var tagColors = Zotero.Tags.getColors(item.libraryID);
		var tags = item.getTags().map((t) => {
			let obj = {
				name: t.tag
			};
			if (tagColors.has(t.tag)) {
				obj.color = tagColors.get(t.tag).color;
				// Add 'position' for sorting
				obj.position = tagColors.get(t.tag).position;
			}
			return obj;
		});
		// Sort colored tags by position and other tags by name
		tags.sort((a, b) => {
			if (!a.color && !b.color) return Zotero.localeCompare(a.name, b.name);
			if (!a.color && !b.color) return -1;
			if (!a.color && b.color) return 1;
			return a.position - b.position;
		});
		// Remove temporary 'position' value
		tags.forEach(t => delete t.position);
		if (tags.length) {
			o.tags = tags;
		}
		
		o.dateModified = item.dateModified;
		return o;
	};
	
	
	/**
	 * @param {Zotero.Item} attachment - Saved parent attachment item
	 * @param {Object} json
	 * @return {Promise<Zotero.Item>} - Promise for an annotation item
	 */
	this.saveFromJSON = async function (attachment, json, saveOptions = {}) {
		if (!attachment) {
			throw new Error("'attachment' not provided");
		}
		if (!attachment.libraryID) {
			throw new Error("'attachment' is not saved");
		}
		if (!json.key) {
			throw new Error("'key' not provided in JSON");
		}
		
		var item = Zotero.Items.getByLibraryAndKey(attachment.libraryID, json.key);
		if (!item) {
			item = new Zotero.Item('annotation');
			item.libraryID = attachment.libraryID;
			item.key = json.key;
			await item.loadPrimaryData();
		}
		item.parentID = attachment.id;
		
		item._requireData('annotation');
		item._requireData('annotationDeferred');
		item.annotationType = json.type;
		if (json.type == 'highlight') {
			item.annotationText = json.text;
		}
		item.annotationComment = json.comment;
		item.annotationColor = json.color;
		item.annotationPageLabel = json.pageLabel;
		item.annotationSortIndex = json.sortIndex;
		item.annotationPosition = JSON.stringify(Object.assign({}, json.position));
		// TODO: Can colors be set?
		item.setTags((json.tags || []).map(t => ({ tag: t.name })));
		
		await item.saveTx(saveOptions);
		
		return item;
	};
};
