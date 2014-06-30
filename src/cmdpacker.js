// @fileOverview: local_tasks/tools/src/cmdPacker.js
// Date: 2013- 8-07
// Time: 10:41
// @description:
// 这个地方需要实现一套module1.1,解析页面中的require参数，包括css中的require.
// 对JS写法的要求：按照CMD的规范进行书写
//
// eg:
//  define('<div>tttttt</div>');
//  define({"tt": "bar", "bb": "foo"});
//  define(function (require, exports, module) {});
//
// CSS的想法来源：https://docs.google.com/presentation/d/1_LpRI2_grOgTKyqodgg8yWGDhStgZHxnvjFOTJ6Jb3g/edit?usp=drive_web
// 当require的时候就查找有没有CSS,如果有就存入merge list中。
// @author: xiaoxiong

/*jshint unused: false, eqnull: false, browser: true, nomen: true, indent: 4, maxlen: 80, strict: true, curly: true */
/*global define: true, $: true, youdao: true */
'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('underscore');

var pack = function (root, entry_point, target_point, moduelJsPath) {

    // 将基本路径调整到scripts这个文件夹
    // var root = '/Users/chengmu/Documents/batcave/favorites/script';
    // var entry_point = "./index.js";
    // var target_point = "./dist/main.js";
    // var moduelJsPath = "./modules.js";
    var basePath = path.dirname(path.join(root, entry_point));
    var moduelList = [];
    var requireList = [];
    var sassModulList = {};


    //获取入口文件的相关信息
    var baseEntry = path.basename(entry_point);
    var baseEntryObj = {};
    baseEntryObj['content'] = resoveRequire(entry_point, root);
    baseEntryObj['dependPath'] = root;
    baseEntryObj['currentPath'] = path.resolve(entry_point);
    baseEntryObj['id'] = baseEntry;
    moduelList.push(baseEntryObj);
    requireList.push(baseEntry);

    function resoveRequire(fileName, relativePath) {

        //这里需要判断一下文件是否存在
        var content = fs.readFileSync(fileName, "utf-8");
        var REQUIRE_RE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*require|(?:^|[^$])\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g;
        var SLASH_RE = /\\\\/g;
        var temptCont = content;
        var _fileId;
        content.replace(SLASH_RE, '').replace(REQUIRE_RE, function (m, m1, m2) {
            if (m2) {
                var _fileName;
                //得到文件的绝对路径，即:require里面的参数然后加上当前路径
                _fileName = path.resolve(relativePath, m2);
                //去除文件名的前面部分，得到文件的id
                // _fileId = _fileName.replace(basePath + '/', '');
                    _fileId = path.relative(basePath, _fileName).replace(/\\/g, '\/');

                //得到当前文件夹的名称
                var relPath = path.resolve(_fileName, '..');

                // 查看是否已经打包过了
                if (requireList.indexOf(_fileId) < 0) {

                    //递归进入文件中的require
                    var childContent = resoveRequire(_fileName, relPath);

                    //构建依赖图
                    var temptModuleObj = {};
                    temptModuleObj['content'] = childContent;
                    temptModuleObj['dependPath'] = fileName;
                    temptModuleObj['currentPath'] = _fileName;
                    temptModuleObj['id'] = _fileId;
                    moduelList.push(temptModuleObj);
                    requireList.push(_fileId);
                    //resolveCss(_fileName);
                }

                var temptArray;
                temptArray = temptCont.split(m2);
                temptCont = temptArray.join(_fileId);
            }
        });
        return temptCont;
    };


    function dealSass() {
        var sassItem;

        var sassContent = "";
        for (sassItem in sassModulList) {
            if (sassModulList.hasOwnProperty(sassItem)) {
                sassContent += sassModulList[sassItem];
            }
        }
        return sassContent;
    }

    function dealModuleId() {
        var moduleItem;

        moduelList.forEach(function (moduleItem) {
            var moduleId = moduleItem.id;
            var extName = path.extname(moduleId);
            var escapeContent;
            switch (extName) {
                case '.html':
                    escapeContent = jsEscape(moduleItem.content);
                    escapeContent = "define('" + moduleId + "', function () { return ' " + escapeContent + "';});\n";
                    moduleItem.content = escapeContent;
                    resolveSass(moduleItem);
                    break;
                case '':
                case '.js':
                    moduleItem.content = addModuleId(moduleItem.content, moduleId);
                    break;
                default:
                    break;
            }
        });

    };

    function resolveSass(moduleItem) {
        var extName = path.extname(moduleItem.currentPath);
        var baseName = path.basename(moduleItem.currentPath, extName);
        var currentFolder = path.join(moduleItem.currentPath, "../");

        var IMPORT_RE = /"(?:\\"|[^""])*"|'(?:\\'|[^''])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*@import|(?:^|[^$])@import\s*(["''"])(.+?)\1\s*;/g;
        var SLASH_RE = /\\\\/g;

        var sassFile = path.join(currentFolder, baseName + ".scss");
        if (fs.existsSync(sassFile)) {
            moduleItem['sassPaths'] = [];
            var fileId = sassFile.replace(basePath + '/', '');
            var fileContent = fs.readFileSync(sassFile, 'utf-8');
            fileContent.replace(SLASH_RE, "").replace(IMPORT_RE, function (m, m1, m2) {
                if (m2) {
                    var fileName = m2.replace(/\'|\"/g, "");
                    var subFileList = fileName.split(",");
                    subFileList.forEach(function (fileItem) {
                        var currentFileName = path.resolve(currentFolder, fileItem.trim() + ".scss");
                        moduleItem['sassPaths'].push(currentFileName);
                    });
                }
            });

            moduleItem['sassPaths'].push(sassFile);
            sassModulList[fileId] = fileContent;
        }

    }

    function jsEscape(content) {
            return content.replace(/(['\\])/g, '\\$1')
                .replace(/[\f]/g, '\\f')
                .replace(/[\b]/g, '\\b')
                .replace(/[\n]/g, '\\n')
                .replace(/[\t]/g, '\\t')
                .replace(/[\r]/g, '\\r')
                .replace(/[\u2028]/g, '\\u2028')
                .replace(/[\u2029]/g, '\\u2029');
        };

    function addModuleId(content, id) {
        var replaceStr = 'define("' + id + '", ';
        return content.replace(/define\s*\(/, replaceStr);
    };

    dealModuleId();

    function concatSass() {
        var sassList = [];
        var allSassContent = '';
        moduelList.forEach(function (moduleItem) {
            var moduleSass = moduleItem.sassPaths || [];
            moduleSass.forEach(function (sassItem) {
                if (sassList.indexOf(sassItem) < 0 && fs.existsSync(sassItem)) {
                    sassList.push(sassItem);
                    var sassFileContent = fs.readFileSync(sassItem, 'utf-8');
                    var sassFileContentArray = sassFileContent.split('\n');
                    var temptContent = sassFileContentArray.map(function (temptItem) {
                        if (temptItem.indexOf("@import") >= 0) {
                            return "";
                        }
                        return temptItem;
                    });
                    allSassContent += temptContent.join("\n");
                }
            });
        });
        console.log(allSassContent);
    }

    concatSass();
    dealSass();


    function fragement() {
        _.templateSettings = {
            escape: /\/[\*-]<%-([\s\S]+?)%>[\*-]\//g,
                evaluate: /\/[\*-]<%([\s\S]+?)%>[\*-]\//g,
                interpolate: /\/[\*-]<%=([\s\S]+?)%>[\*-]\//g
        };

        var moduleItem;
        var cmdContent = fs.readFileSync(moduelJsPath, 'utf-8');
        for (moduleItem in moduelList) {
            if (moduelList.hasOwnProperty(moduleItem)) {
                cmdContent += moduelList[moduleItem].content;
            }
        }
        return cmdContent;
    };


    var cmdContent = fragement();

    var mkdirp = require('mkdirp');

    mkdirp(path.dirname(target_point), function (err) {
        if (err) console.error(err);
        fs.writeFileSync(target_point, cmdContent);
    });
    return cmdContent;
};

// pack();
module.exports = pack;
