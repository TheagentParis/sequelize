'use strict';

const each = require('lodash/each');

const chai = require('chai');

const expect = chai.expect;
const { Op } = require('@sequelize/core');
const { PostgresQueryGenerator: QueryGenerator } = require('@sequelize/postgres');
const Support = require('../../../support');

const dialect = Support.getTestDialect();
const dayjs = require('dayjs');

if (dialect.startsWith('postgres')) {
  describe('[POSTGRES Specific] QueryGenerator', () => {
    Support.allowDeprecationsInSuite(['SEQUELIZE0023']);

    const suites = {
      changeColumnQuery: [
        {
          arguments: [
            'myTable',
            {
              col_1: "ENUM('value 1', 'value 2') NOT NULL",
              col_2: "ENUM('value 3', 'value 4') NOT NULL",
            },
          ],
          expectation: `ALTER TABLE "myTable" ALTER COLUMN "col_1" SET NOT NULL;ALTER TABLE "myTable" ALTER COLUMN "col_1" DROP DEFAULT;DO 'BEGIN CREATE TYPE "public"."enum_myTable_col_1" AS ENUM(''value 1'', ''value 2''); EXCEPTION WHEN duplicate_object THEN null; END';ALTER TABLE "myTable" ALTER COLUMN "col_1" TYPE "public"."enum_myTable_col_1" USING ("col_1"::"public"."enum_myTable_col_1");ALTER TABLE "myTable" ALTER COLUMN "col_2" SET NOT NULL;ALTER TABLE "myTable" ALTER COLUMN "col_2" DROP DEFAULT;DO 'BEGIN CREATE TYPE "public"."enum_myTable_col_2" AS ENUM(''value 3'', ''value 4''); EXCEPTION WHEN duplicate_object THEN null; END';ALTER TABLE "myTable" ALTER COLUMN "col_2" TYPE "public"."enum_myTable_col_2" USING ("col_2"::"public"."enum_myTable_col_2");`,
        },
      ],

      selectQuery: [
        {
          arguments: ['myTable'],
          expectation: 'SELECT * FROM "myTable";',
        },
        {
          arguments: ['myTable', { attributes: ['id', 'name'] }],
          expectation: 'SELECT "id", "name" FROM "myTable";',
        },
        {
          arguments: ['myTable', { where: { id: 2 } }],
          expectation: 'SELECT * FROM "myTable" WHERE "myTable"."id" = 2;',
        },
        {
          arguments: ['myTable', { where: { name: 'foo' } }],
          expectation: 'SELECT * FROM "myTable" WHERE "myTable"."name" = \'foo\';',
        },
        {
          arguments: ['myTable', { order: ['id'] }],
          expectation: 'SELECT * FROM "myTable" ORDER BY "id";',
          context: QueryGenerator,
        },
        {
          arguments: ['myTable', { order: ['id', 'DESC'] }],
          expectation: 'SELECT * FROM "myTable" ORDER BY "id", "DESC";',
          context: QueryGenerator,
        },
        {
          arguments: ['myTable', { order: ['myTable.id'] }],
          expectation: 'SELECT * FROM "myTable" ORDER BY "myTable"."id";',
          context: QueryGenerator,
        },
        {
          arguments: ['myTable', { order: [['myTable.id', 'DESC']] }],
          expectation: 'SELECT * FROM "myTable" ORDER BY "myTable"."id" DESC;',
          context: QueryGenerator,
        },
        {
          arguments: [
            'myTable',
            { order: [['id', 'DESC']] },
            function (sequelize) {
              return sequelize.define('myTable', {});
            },
          ],
          expectation: 'SELECT * FROM "myTable" AS "myTable" ORDER BY "myTable"."id" DESC;',
          context: QueryGenerator,
          needsSequelize: true,
        },
        {
          arguments: [
            'myTable',
            { order: [['id', 'DESC'], ['name']] },
            function (sequelize) {
              return sequelize.define('myTable', {});
            },
          ],
          expectation:
            'SELECT * FROM "myTable" AS "myTable" ORDER BY "myTable"."id" DESC, "myTable"."name";',
          context: QueryGenerator,
          needsSequelize: true,
        },
        {
          title: 'single string argument should be quoted',
          arguments: ['myTable', { group: 'name' }],
          expectation: 'SELECT * FROM "myTable" GROUP BY "name";',
        },
        {
          arguments: ['myTable', { group: ['name'] }],
          expectation: 'SELECT * FROM "myTable" GROUP BY "name";',
        },
        {
          title: 'functions work for group by',
          arguments: [
            'myTable',
            function (sequelize) {
              return {
                group: [sequelize.fn('YEAR', sequelize.col('createdAt'))],
              };
            },
          ],
          expectation: 'SELECT * FROM "myTable" GROUP BY YEAR("createdAt");',
          needsSequelize: true,
        },
        {
          title: 'It is possible to mix sequelize.fn and string arguments to group by',
          arguments: [
            'myTable',
            function (sequelize) {
              return {
                group: [sequelize.fn('YEAR', sequelize.col('createdAt')), 'title'],
              };
            },
          ],
          expectation: 'SELECT * FROM "myTable" GROUP BY YEAR("createdAt"), "title";',
          context: QueryGenerator,
          needsSequelize: true,
        },
        {
          arguments: ['myTable', { group: ['name', 'title'] }],
          expectation: 'SELECT * FROM "myTable" GROUP BY "name", "title";',
        },
        {
          arguments: [{ tableName: 'myTable', schema: 'mySchema' }],
          expectation: 'SELECT * FROM "mySchema"."myTable";',
        },
        {
          title: "string in array should escape ' as ''",
          arguments: ['myTable', { where: { aliases: { [Op.contains]: ["Queen's"] } } }],
          expectation:
            'SELECT * FROM "myTable" WHERE "myTable"."aliases" @> ARRAY[\'Queen\'\'s\']::VARCHAR(255)[];',
        },

        // Variants when quoteIdentifiers is false
        {
          arguments: ['myTable'],
          expectation: 'SELECT * FROM myTable;',
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: ['myTable', { attributes: ['id', 'name'] }],
          expectation: 'SELECT id, name FROM myTable;',
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: ['myTable', { where: { id: 2 } }],
          expectation: 'SELECT * FROM myTable WHERE myTable.id = 2;',
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: ['myTable', { where: { name: 'foo' } }],
          expectation: "SELECT * FROM myTable WHERE myTable.name = 'foo';",
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: ['myTable', { order: ['id DESC'] }],
          expectation: 'SELECT * FROM myTable ORDER BY id DESC;',
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: ['myTable', { group: 'name' }],
          expectation: 'SELECT * FROM myTable GROUP BY name;',
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: ['myTable', { group: ['name'] }],
          expectation: 'SELECT * FROM myTable GROUP BY name;',
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: ['myTable', { group: ['name', 'title'] }],
          expectation: 'SELECT * FROM myTable GROUP BY name, title;',
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: [{ tableName: 'myTable', schema: 'mySchema' }],
          expectation: 'SELECT * FROM mySchema.myTable;',
          context: { options: { quoteIdentifiers: false } },
        },
      ],

      insertQuery: [
        {
          arguments: ['myTable', {}],
          expectation: {
            query: 'INSERT INTO "myTable" DEFAULT VALUES;',
            bind: {},
          },
        },
        {
          arguments: ['myTable', { name: 'foo' }],
          expectation: {
            query: 'INSERT INTO "myTable" ("name") VALUES ($sequelize_1);',
            bind: { sequelize_1: 'foo' },
          },
        },
        {
          arguments: ['myTable', { name: 'foo' }, {}, { ignoreDuplicates: true }],
          expectation: {
            query: 'INSERT INTO "myTable" ("name") VALUES ($sequelize_1) ON CONFLICT DO NOTHING;',
            bind: { sequelize_1: 'foo' },
          },
        },
        {
          arguments: ['myTable', { name: 'foo' }, {}, { returning: true }],
          expectation: {
            query: 'INSERT INTO "myTable" ("name") VALUES ($sequelize_1) RETURNING *;',
            bind: { sequelize_1: 'foo' },
          },
        },
        {
          arguments: ['myTable', { name: 'foo' }, {}, { ignoreDuplicates: true, returning: true }],
          expectation: {
            query:
              'INSERT INTO "myTable" ("name") VALUES ($sequelize_1) ON CONFLICT DO NOTHING RETURNING *;',
            bind: { sequelize_1: 'foo' },
          },
        },
        {
          arguments: ['myTable', { name: "foo';DROP TABLE myTable;" }],
          expectation: {
            query: 'INSERT INTO "myTable" ("name") VALUES ($sequelize_1);',
            bind: { sequelize_1: `foo';DROP TABLE myTable;` },
          },
        },
        {
          arguments: ['myTable', { data: Buffer.from('Sequelize') }],
          expectation: {
            query: 'INSERT INTO "myTable" ("data") VALUES ($sequelize_1);',
            bind: {
              sequelize_1: Buffer.from('Sequelize'),
            },
          },
        },
        {
          arguments: ['myTable', { name: 'foo', foo: 1 }],
          expectation: {
            query: 'INSERT INTO "myTable" ("name","foo") VALUES ($sequelize_1,$sequelize_2);',
            bind: { sequelize_1: 'foo', sequelize_2: 1 },
          },
        },
        {
          arguments: ['myTable', { name: 'foo', nullValue: null }],
          expectation: {
            query: 'INSERT INTO "myTable" ("name","nullValue") VALUES ($sequelize_1,$sequelize_2);',
            bind: { sequelize_1: 'foo', sequelize_2: null },
          },
        },
        {
          arguments: ['myTable', { name: 'foo', nullValue: null }],
          expectation: {
            query: 'INSERT INTO "myTable" ("name","nullValue") VALUES ($sequelize_1,$sequelize_2);',
            bind: { sequelize_1: 'foo', sequelize_2: null },
          },
          context: { options: { omitNull: false } },
        },
        {
          arguments: ['myTable', { name: 'foo', nullValue: null }],
          expectation: {
            query: 'INSERT INTO "myTable" ("name") VALUES ($sequelize_1);',
            bind: { sequelize_1: 'foo' },
          },
          context: { options: { omitNull: true } },
        },
        {
          arguments: ['myTable', { name: 'foo', nullValue: undefined }],
          expectation: {
            query: 'INSERT INTO "myTable" ("name") VALUES ($sequelize_1);',
            bind: { sequelize_1: 'foo' },
          },
          context: { options: { omitNull: true } },
        },
        {
          arguments: [{ tableName: 'myTable', schema: 'mySchema' }, { name: 'foo' }],
          expectation: {
            query: 'INSERT INTO "mySchema"."myTable" ("name") VALUES ($sequelize_1);',
            bind: { sequelize_1: 'foo' },
          },
        },
        {
          arguments: [
            { tableName: 'myTable', schema: 'mySchema' },
            { name: JSON.stringify({ info: 'Look ma a " quote' }) },
          ],
          expectation: {
            query: 'INSERT INTO "mySchema"."myTable" ("name") VALUES ($sequelize_1);',
            bind: { sequelize_1: '{"info":"Look ma a \\" quote"}' },
          },
        },
        {
          arguments: [
            { tableName: 'myTable', schema: 'mySchema' },
            { name: "foo';DROP TABLE mySchema.myTable;" },
          ],
          expectation: {
            query: 'INSERT INTO "mySchema"."myTable" ("name") VALUES ($sequelize_1);',
            bind: { sequelize_1: "foo';DROP TABLE mySchema.myTable;" },
          },
        },
        {
          arguments: [
            'myTable',
            function (sequelize) {
              return {
                foo: sequelize.fn('NOW'),
              };
            },
          ],
          expectation: {
            query: 'INSERT INTO "myTable" ("foo") VALUES (NOW());',
            bind: {},
          },
          needsSequelize: true,
        },

        // Variants when quoteIdentifiers is false
        {
          arguments: ['myTable', { name: 'foo' }],
          expectation: {
            query: 'INSERT INTO myTable (name) VALUES ($sequelize_1);',
            bind: { sequelize_1: 'foo' },
          },
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: ['myTable', { name: "foo';DROP TABLE myTable;" }],
          expectation: {
            query: 'INSERT INTO myTable (name) VALUES ($sequelize_1);',
            bind: { sequelize_1: "foo';DROP TABLE myTable;" },
          },
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: ['myTable', { name: 'foo', foo: 1 }],
          expectation: {
            query: 'INSERT INTO myTable (name,foo) VALUES ($sequelize_1,$sequelize_2);',
            bind: { sequelize_1: 'foo', sequelize_2: 1 },
          },
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: ['myTable', { name: 'foo', nullValue: null }],
          expectation: {
            query: 'INSERT INTO myTable (name,nullValue) VALUES ($sequelize_1,$sequelize_2);',
            bind: { sequelize_1: 'foo', sequelize_2: null },
          },
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: ['myTable', { name: 'foo', nullValue: null }],
          expectation: {
            query: 'INSERT INTO myTable (name,nullValue) VALUES ($sequelize_1,$sequelize_2);',
            bind: { sequelize_1: 'foo', sequelize_2: null },
          },
          context: { options: { omitNull: false, quoteIdentifiers: false } },
        },
        {
          arguments: ['myTable', { name: 'foo', nullValue: null }],
          expectation: {
            query: 'INSERT INTO myTable (name) VALUES ($sequelize_1);',
            bind: { sequelize_1: 'foo' },
          },
          context: { options: { omitNull: true, quoteIdentifiers: false } },
        },
        {
          arguments: ['myTable', { name: 'foo', nullValue: undefined }],
          expectation: {
            query: 'INSERT INTO myTable (name) VALUES ($sequelize_1);',
            bind: { sequelize_1: 'foo' },
          },
          context: { options: { omitNull: true, quoteIdentifiers: false } },
        },
        {
          arguments: [{ tableName: 'myTable', schema: 'mySchema' }, { name: 'foo' }],
          expectation: {
            query: 'INSERT INTO mySchema.myTable (name) VALUES ($sequelize_1);',
            bind: { sequelize_1: 'foo' },
          },
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: [
            { tableName: 'myTable', schema: 'mySchema' },
            { name: JSON.stringify({ info: 'Look ma a " quote' }) },
          ],
          expectation: {
            query: 'INSERT INTO mySchema.myTable (name) VALUES ($sequelize_1);',
            bind: { sequelize_1: '{"info":"Look ma a \\" quote"}' },
          },
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: [
            { tableName: 'myTable', schema: 'mySchema' },
            { name: "foo';DROP TABLE mySchema.myTable;" },
          ],
          expectation: {
            query: 'INSERT INTO mySchema.myTable (name) VALUES ($sequelize_1);',
            bind: { sequelize_1: "foo';DROP TABLE mySchema.myTable;" },
          },
          context: { options: { quoteIdentifiers: false } },
        },
      ],

      bulkInsertQuery: [
        {
          arguments: ['myTable', [{ name: 'foo' }, { name: 'bar' }]],
          expectation: 'INSERT INTO "myTable" ("name") VALUES (\'foo\'),(\'bar\');',
        },
        {
          arguments: ['myTable', [{ name: 'foo' }, { name: 'bar' }], { ignoreDuplicates: true }],
          expectation:
            'INSERT INTO "myTable" ("name") VALUES (\'foo\'),(\'bar\') ON CONFLICT DO NOTHING;',
        },
        {
          arguments: ['myTable', [{ name: 'foo' }, { name: 'bar' }], { returning: true }],
          expectation: 'INSERT INTO "myTable" ("name") VALUES (\'foo\'),(\'bar\') RETURNING *;',
        },
        {
          arguments: [
            'myTable',
            [{ name: 'foo' }, { name: 'bar' }],
            { returning: ['id', 'sentToId'] },
          ],
          expectation:
            'INSERT INTO "myTable" ("name") VALUES (\'foo\'),(\'bar\') RETURNING "id", "sentToId";',
        },
        {
          arguments: [
            'myTable',
            [{ name: 'foo' }, { name: 'bar' }],
            { ignoreDuplicates: true, returning: true },
          ],
          expectation:
            'INSERT INTO "myTable" ("name") VALUES (\'foo\'),(\'bar\') ON CONFLICT DO NOTHING RETURNING *;',
        },
        {
          arguments: ['myTable', [{ name: "foo';DROP TABLE myTable;" }, { name: 'bar' }]],
          expectation:
            "INSERT INTO \"myTable\" (\"name\") VALUES ('foo'';DROP TABLE myTable;'),('bar');",
        },
        {
          arguments: [
            'myTable',
            [
              {
                name: 'foo',
                birthday: dayjs('2011-03-27 10:01:55 +0000', 'YYYY-MM-DD HH:mm:ss Z').toDate(),
              },
              {
                name: 'bar',
                birthday: dayjs('2012-03-27 10:01:55 +0000', 'YYYY-MM-DD HH:mm:ss Z').toDate(),
              },
            ],
          ],
          expectation:
            "INSERT INTO \"myTable\" (\"name\",\"birthday\") VALUES ('foo','2011-03-27 10:01:55.000 +00:00'),('bar','2012-03-27 10:01:55.000 +00:00');",
        },
        {
          arguments: [
            'myTable',
            [
              { name: 'foo', foo: 1 },
              { name: 'bar', foo: 2 },
            ],
          ],
          expectation: 'INSERT INTO "myTable" ("name","foo") VALUES (\'foo\',1),(\'bar\',2);',
        },
        {
          arguments: [
            'myTable',
            [
              { name: 'foo', nullValue: null },
              { name: 'bar', nullValue: null },
            ],
          ],
          expectation:
            'INSERT INTO "myTable" ("name","nullValue") VALUES (\'foo\',NULL),(\'bar\',NULL);',
        },
        {
          arguments: [
            'myTable',
            [
              { name: 'foo', nullValue: null },
              { name: 'bar', nullValue: null },
            ],
          ],
          expectation:
            'INSERT INTO "myTable" ("name","nullValue") VALUES (\'foo\',NULL),(\'bar\',NULL);',
          context: { options: { omitNull: false } },
        },
        {
          arguments: [
            'myTable',
            [
              { name: 'foo', nullValue: null },
              { name: 'bar', nullValue: null },
            ],
          ],
          expectation:
            'INSERT INTO "myTable" ("name","nullValue") VALUES (\'foo\',NULL),(\'bar\',NULL);',
          context: { options: { omitNull: true } }, // Note: We don't honour this because it makes little sense when some rows may have nulls and others not
        },
        {
          arguments: [
            'myTable',
            [
              { name: 'foo', nullValue: undefined },
              { name: 'bar', nullValue: undefined },
            ],
          ],
          expectation:
            'INSERT INTO "myTable" ("name","nullValue") VALUES (\'foo\',NULL),(\'bar\',NULL);',
          context: { options: { omitNull: true } }, // Note: As above
        },
        {
          arguments: [
            { schema: 'mySchema', tableName: 'myTable' },
            [{ name: 'foo' }, { name: 'bar' }],
          ],
          expectation: 'INSERT INTO "mySchema"."myTable" ("name") VALUES (\'foo\'),(\'bar\');',
        },
        {
          arguments: [
            { schema: 'mySchema', tableName: 'myTable' },
            [
              { name: JSON.stringify({ info: 'Look ma a " quote' }) },
              { name: JSON.stringify({ info: 'Look ma another " quote' }) },
            ],
          ],
          expectation:
            'INSERT INTO "mySchema"."myTable" ("name") VALUES (\'{"info":"Look ma a \\" quote"}\'),(\'{"info":"Look ma another \\" quote"}\');',
        },
        {
          arguments: [
            { schema: 'mySchema', tableName: 'myTable' },
            [{ name: "foo';DROP TABLE mySchema.myTable;" }, { name: 'bar' }],
          ],
          expectation:
            'INSERT INTO "mySchema"."myTable" ("name") VALUES (\'foo\'\';DROP TABLE mySchema.myTable;\'),(\'bar\');',
        },
        {
          arguments: [
            { schema: 'mySchema', tableName: 'myTable' },
            [{ name: 'foo' }, { name: 'bar' }],
            { updateOnDuplicate: ['name'], upsertKeys: ['name'] },
          ],
          expectation:
            'INSERT INTO "mySchema"."myTable" ("name") VALUES (\'foo\'),(\'bar\') ON CONFLICT ("name") DO UPDATE SET "name"=EXCLUDED."name";',
        },

        // Variants when quoteIdentifiers is false
        {
          arguments: ['myTable', [{ name: 'foo' }, { name: 'bar' }]],
          expectation: "INSERT INTO myTable (name) VALUES ('foo'),('bar');",
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: ['myTable', [{ name: "foo';DROP TABLE myTable;" }, { name: 'bar' }]],
          expectation: "INSERT INTO myTable (name) VALUES ('foo'';DROP TABLE myTable;'),('bar');",
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: [
            'myTable',
            [
              {
                name: 'foo',
                birthday: dayjs('2011-03-27 10:01:55 +0000', 'YYYY-MM-DD HH:mm:ss Z').toDate(),
              },
              {
                name: 'bar',
                birthday: dayjs('2012-03-27 10:01:55 +0000', 'YYYY-MM-DD HH:mm:ss Z').toDate(),
              },
            ],
          ],
          expectation:
            "INSERT INTO myTable (name,birthday) VALUES ('foo','2011-03-27 10:01:55.000 +00:00'),('bar','2012-03-27 10:01:55.000 +00:00');",
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: [
            'myTable',
            [
              { name: 'foo', foo: 1 },
              { name: 'bar', foo: 2 },
            ],
          ],
          expectation: "INSERT INTO myTable (name,foo) VALUES ('foo',1),('bar',2);",
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: [
            'myTable',
            [
              { name: 'foo', nullValue: null },
              { name: 'bar', nullValue: null },
            ],
          ],
          expectation: `INSERT INTO myTable (name,nullValue) VALUES ('foo',NULL),('bar',NULL);`,
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: [
            'myTable',
            [
              { name: 'foo', nullValue: null },
              { name: 'bar', nullValue: null },
            ],
          ],
          expectation: `INSERT INTO myTable (name,nullValue) VALUES ('foo',NULL),('bar',NULL);`,
          context: { options: { quoteIdentifiers: false, omitNull: false } },
        },
        {
          arguments: [
            'myTable',
            [
              { name: 'foo', nullValue: null },
              { name: 'bar', nullValue: null },
            ],
          ],
          expectation: `INSERT INTO myTable (name,nullValue) VALUES ('foo',NULL),('bar',NULL);`,
          context: { options: { omitNull: true, quoteIdentifiers: false } }, // Note: We don't honour this because it makes little sense when some rows may have nulls and others not
        },
        {
          arguments: [
            'myTable',
            [
              { name: 'foo', nullValue: undefined },
              { name: 'bar', nullValue: undefined },
            ],
          ],
          expectation: `INSERT INTO myTable (name,nullValue) VALUES ('foo',NULL),('bar',NULL);`,
          context: { options: { omitNull: true, quoteIdentifiers: false } }, // Note: As above
        },
        {
          arguments: [
            { schema: 'mySchema', tableName: 'myTable' },
            [{ name: 'foo' }, { name: 'bar' }],
          ],
          expectation: `INSERT INTO mySchema.myTable (name) VALUES ('foo'),('bar');`,
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: [
            { schema: 'mySchema', tableName: 'myTable' },
            [
              { name: JSON.stringify({ info: 'Look ma a " quote' }) },
              { name: JSON.stringify({ info: 'Look ma another " quote' }) },
            ],
          ],
          expectation:
            'INSERT INTO mySchema.myTable (name) VALUES (\'{"info":"Look ma a \\" quote"}\'),(\'{"info":"Look ma another \\" quote"}\');',
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: [
            { schema: 'mySchema', tableName: 'myTable' },
            [{ name: "foo';DROP TABLE mySchema.myTable;" }, { name: 'bar' }],
          ],
          expectation:
            "INSERT INTO mySchema.myTable (name) VALUES ('foo'';DROP TABLE mySchema.myTable;'),('bar');",
          context: { options: { quoteIdentifiers: false } },
        },
      ],

      updateQuery: [
        {
          arguments: ['myTable', { bar: 2 }, { name: 'foo' }],
          expectation: {
            query: 'UPDATE "myTable" SET "bar"=$sequelize_1 WHERE "name" = $sequelize_2',
            bind: { sequelize_1: 2, sequelize_2: 'foo' },
          },
        },
        {
          arguments: ['myTable', { bar: 2 }, { name: 'foo' }, { returning: true }],
          expectation: {
            query:
              'UPDATE "myTable" SET "bar"=$sequelize_1 WHERE "name" = $sequelize_2 RETURNING *',
            bind: { sequelize_1: 2, sequelize_2: 'foo' },
          },
        },
        {
          arguments: ['myTable', { name: "foo';DROP TABLE myTable;" }, { name: 'foo' }],
          expectation: {
            query: 'UPDATE "myTable" SET "name"=$sequelize_1 WHERE "name" = $sequelize_2',
            bind: { sequelize_1: "foo';DROP TABLE myTable;", sequelize_2: 'foo' },
          },
        },
        {
          arguments: ['myTable', { bar: 2, nullValue: null }, { name: 'foo' }],
          expectation: {
            query:
              'UPDATE "myTable" SET "bar"=$sequelize_1,"nullValue"=$sequelize_2 WHERE "name" = $sequelize_3',
            bind: { sequelize_1: 2, sequelize_2: null, sequelize_3: 'foo' },
          },
        },
        {
          arguments: ['myTable', { bar: 2, nullValue: null }, { name: 'foo' }],
          expectation: {
            query:
              'UPDATE "myTable" SET "bar"=$sequelize_1,"nullValue"=$sequelize_2 WHERE "name" = $sequelize_3',
            bind: { sequelize_1: 2, sequelize_2: null, sequelize_3: 'foo' },
          },
          context: { options: { omitNull: false } },
        },
        {
          arguments: ['myTable', { bar: 2, nullValue: null }, { name: 'foo' }],
          expectation: {
            query: 'UPDATE "myTable" SET "bar"=$sequelize_1 WHERE "name" = $sequelize_2',
            bind: { sequelize_1: 2, sequelize_2: 'foo' },
          },
          context: { options: { omitNull: true } },
        },
        {
          arguments: ['myTable', { bar: 2, nullValue: undefined }, { name: 'foo' }],
          expectation: {
            query: 'UPDATE "myTable" SET "bar"=$sequelize_1 WHERE "name" = $sequelize_2',
            bind: { sequelize_1: 2, sequelize_2: 'foo' },
          },
          context: { options: { omitNull: true } },
        },
        {
          arguments: [
            { tableName: 'myTable', schema: 'mySchema' },
            { name: "foo';DROP TABLE mySchema.myTable;" },
            { name: 'foo' },
          ],
          expectation: {
            query:
              'UPDATE "mySchema"."myTable" SET "name"=$sequelize_1 WHERE "name" = $sequelize_2',
            bind: { sequelize_1: "foo';DROP TABLE mySchema.myTable;", sequelize_2: 'foo' },
          },
        },
        {
          arguments: [
            'myTable',
            function (sequelize) {
              return {
                bar: sequelize.fn('NOW'),
              };
            },
            { name: 'foo' },
          ],
          expectation: {
            query: 'UPDATE "myTable" SET "bar"=NOW() WHERE "name" = $sequelize_1',
            bind: { sequelize_1: 'foo' },
          },
          needsSequelize: true,
        },
        {
          arguments: [
            'myTable',
            function (sequelize) {
              return {
                bar: sequelize.col('foo'),
              };
            },
            { name: 'foo' },
          ],
          expectation: {
            query: 'UPDATE "myTable" SET "bar"="foo" WHERE "name" = $sequelize_1',
            bind: { sequelize_1: 'foo' },
          },
          needsSequelize: true,
        },

        // Variants when quoteIdentifiers is false
        {
          arguments: ['myTable', { bar: 2 }, { name: 'foo' }],
          expectation: {
            query: 'UPDATE myTable SET bar=$sequelize_1 WHERE name = $sequelize_2',
            bind: { sequelize_1: 2, sequelize_2: 'foo' },
          },
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: ['myTable', { name: "foo';DROP TABLE myTable;" }, { name: 'foo' }],
          expectation: {
            query: 'UPDATE myTable SET name=$sequelize_1 WHERE name = $sequelize_2',
            bind: { sequelize_1: "foo';DROP TABLE myTable;", sequelize_2: 'foo' },
          },
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: ['myTable', { bar: 2, nullValue: null }, { name: 'foo' }],
          expectation: {
            query:
              'UPDATE myTable SET bar=$sequelize_1,nullValue=$sequelize_2 WHERE name = $sequelize_3',
            bind: { sequelize_1: 2, sequelize_2: null, sequelize_3: 'foo' },
          },
          context: { options: { quoteIdentifiers: false } },
        },
        {
          arguments: ['myTable', { bar: 2, nullValue: null }, { name: 'foo' }],
          expectation: {
            query:
              'UPDATE myTable SET bar=$sequelize_1,nullValue=$sequelize_2 WHERE name = $sequelize_3',
            bind: { sequelize_1: 2, sequelize_2: null, sequelize_3: 'foo' },
          },
          context: { options: { omitNull: false, quoteIdentifiers: false } },
        },
        {
          arguments: ['myTable', { bar: 2, nullValue: null }, { name: 'foo' }],
          expectation: {
            query: 'UPDATE myTable SET bar=$sequelize_1 WHERE name = $sequelize_2',
            bind: { sequelize_1: 2, sequelize_2: 'foo' },
          },
          context: { options: { omitNull: true, quoteIdentifiers: false } },
        },
        {
          arguments: ['myTable', { bar: 2, nullValue: undefined }, { name: 'foo' }],
          expectation: {
            query: 'UPDATE myTable SET bar=$sequelize_1 WHERE name = $sequelize_2',
            bind: { sequelize_1: 2, sequelize_2: 'foo' },
          },
          context: { options: { omitNull: true, quoteIdentifiers: false } },
        },
        {
          arguments: [
            { schema: 'mySchema', tableName: 'myTable' },
            { name: "foo';DROP TABLE mySchema.myTable;" },
            { name: 'foo' },
          ],
          expectation: {
            query: 'UPDATE mySchema.myTable SET name=$sequelize_1 WHERE name = $sequelize_2',
            bind: { sequelize_1: "foo';DROP TABLE mySchema.myTable;", sequelize_2: 'foo' },
          },
          context: { options: { quoteIdentifiers: false } },
        },
      ],

      createTrigger: [
        {
          arguments: ['myTable', 'myTrigger', 'after', ['insert'], 'myFunction', [], []],
          expectation:
            'CREATE TRIGGER "myTrigger" AFTER INSERT ON "myTable" EXECUTE PROCEDURE myFunction();',
        },
        {
          arguments: [
            'myTable',
            'myTrigger',
            'before',
            ['insert', 'update'],
            'myFunction',
            [{ name: 'bar', type: 'INTEGER' }],
            [],
          ],
          expectation:
            'CREATE TRIGGER "myTrigger" BEFORE INSERT OR UPDATE ON "myTable" EXECUTE PROCEDURE myFunction(bar INTEGER);',
        },
        {
          arguments: [
            'myTable',
            'myTrigger',
            'instead_of',
            ['insert', 'update'],
            'myFunction',
            [],
            ['FOR EACH ROW'],
          ],
          expectation:
            'CREATE TRIGGER "myTrigger" INSTEAD OF INSERT OR UPDATE ON "myTable" FOR EACH ROW EXECUTE PROCEDURE myFunction();',
        },
        {
          arguments: [
            'myTable',
            'myTrigger',
            'after_constraint',
            ['insert', 'update'],
            'myFunction',
            [{ name: 'bar', type: 'INTEGER' }],
            ['FOR EACH ROW'],
          ],
          expectation:
            'CREATE CONSTRAINT TRIGGER "myTrigger" AFTER INSERT OR UPDATE ON "myTable" FOR EACH ROW EXECUTE PROCEDURE myFunction(bar INTEGER);',
        },
      ],

      dropTrigger: [
        {
          arguments: ['myTable', 'myTrigger'],
          expectation: 'DROP TRIGGER "myTrigger" ON "myTable" RESTRICT;',
        },
      ],

      renameTrigger: [
        {
          arguments: ['myTable', 'oldTrigger', 'newTrigger'],
          expectation: 'ALTER TRIGGER "oldTrigger" ON "myTable" RENAME TO "newTrigger";',
        },
      ],
    };

    each(suites, (tests, suiteTitle) => {
      describe(suiteTitle, () => {
        for (const test of tests) {
          const query = test.expectation.query || test.expectation;
          const title =
            test.title ||
            `Postgres correctly returns ${query} for ${JSON.stringify(test.arguments)}`;
          it(title, () => {
            const newSequelize = Support.createSequelizeInstance({
              ...test.context?.options,
            });

            const queryGenerator = newSequelize.queryGenerator;

            if (test.needsSequelize) {
              if (typeof test.arguments[1] === 'function') {
                test.arguments[1] = test.arguments[1](newSequelize);
              }

              if (typeof test.arguments[2] === 'function') {
                test.arguments[2] = test.arguments[2](newSequelize);
              }
            }

            const conditions = queryGenerator[suiteTitle](...test.arguments);
            expect(conditions).to.deep.equal(test.expectation);
          });
        }
      });
    });

    describe('fromArray()', () => {
      beforeEach(function () {
        this.queryGenerator = new QueryGenerator(this.sequelize.dialect);
      });

      const tests = [
        {
          title: 'should convert an enum with no quoted strings to an array',
          arguments: '{foo,bar,foobar}',
          expectation: ['foo', 'bar', 'foobar'],
        },
        {
          title: 'should convert an enum starting with a quoted string to an array',
          arguments: '{"foo bar",foo,bar}',
          expectation: ['foo bar', 'foo', 'bar'],
        },
        {
          title: 'should convert an enum ending with a quoted string to an array',
          arguments: '{foo,bar,"foo bar"}',
          expectation: ['foo', 'bar', 'foo bar'],
        },
        {
          title: 'should convert an enum with a quoted string in the middle to an array',
          arguments: '{foo,"foo bar",bar}',
          expectation: ['foo', 'foo bar', 'bar'],
        },
        {
          title: 'should convert an enum full of quoted strings to an array',
          arguments: '{"foo bar","foo bar","foo bar"}',
          expectation: ['foo bar', 'foo bar', 'foo bar'],
        },
      ];

      each(tests, test => {
        it(test.title, function () {
          const convertedText = this.queryGenerator.fromArray(test.arguments);
          expect(convertedText).to.deep.equal(test.expectation);
        });
      });
    });
  });
}
