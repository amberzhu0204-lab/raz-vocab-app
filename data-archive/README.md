# 归档：改造前的预置数据

`raz-import-data-old-26-lessons.json` 是 2026 年 10 月改版前 `public/raz-import-data.json` 的原样备份。

里面是 26 课 / 244 个词（单词 + 中文 + 例句 + 图片），课名形如 `RAZ 27: Let's Make Lemonade`。

**为什么归档：** 那批课没有「系列（级别）+ 第几本」的信息，App 改为按 RAZ 系列归类书目后不再自动导入它。
这些书的书名其实和 E 级书目对得上（如 Let's Make Lemonade = E09、All Kinds of Farms = E15），
所以这份数据随时可以按书名重新对回 E 级册号。

要恢复：把文件拷回 `public/raz-import-data.json`，并在 `src/App.tsx` 里重新接上导入逻辑。
