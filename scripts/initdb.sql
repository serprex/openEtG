create table users (
	id bigserial not null primary key,
	name text not null unique,
	auth text not null,
	salt text not null,
	iter int not null,
	algo text not null,
	wealth int not null default(0)
);
create table user_data_types (
	id int not null primary key,
	val text not null
);
create table user_data (
	id bigserial not null primary key,
	user_id bigint not null references users(id),
	type_id int not null references user_data_types,
	name text not null,
	data json not null
);
create table original_import (
	user_data_id bigint not null primary key references user_data(id),
	name text not null,
	pool text not null
);
create table roles (
	id int not null primary key,
	val text not null unique
);
create table user_role (
	user_id bigint not null references users(id),
	role_id int not null references roles(id),
	unique (user_id, role_id)
);
create table motd (
	id int not null primary key,
	val text not null
);
create table bazaar (
	id bigserial not null primary key,
	user_id bigint not null references users(id),
	code int not null,
	q int not null,
	p int not null
);
create table arena_types (
	id int not null primary key,
	val text not null
);
create table arena (
	user_id bigint not null references users(id),
	arena_id int not null references arena_types(id),
	code int not null,
	deck text not null,
	day int not null,
	draw int not null,
	hp int not null,
	mark int not null,
	won int not null,
	loss int not null,
	score int not null,
	"rank" int not null default (-1),
	bestrank int,
	unique (user_id, arena_id)
);
create table codes (
	code text not null primary key,
	val text not null
);
create table strings (
	key text not null primary key,
	val text not null
);
create table stats (
	id bigserial not null primary key,
	user_id bigint not null references users(id),
	stats json not null,
	"set" text not null,
	players json[] not null,
	"when" timestamp not null default now()
);
create table games (
	id bigserial not null primary key,
	data json not null,
	moves json[] not null,
	expire_at timestamp not null
);
create table trade_request (
	user_id bigint not null references users(id),
	for_user_id bigint not null references users(id),
	cards text not null,
	g int not null,
	forcards text,
	forg int,
	expire_at timestamp not null,
	unique (user_id, for_user_id)
);
create table match_request (
	game_id bigint not null references games(id),
	user_id bigint not null references users(id),
	accepted boolean not null,
	unique (game_id, user_id)
);

insert into roles values (1, 'Codesmith'), (2, 'Mod');
insert into arena_types values (1, 'A1'), (2, 'A2');
insert into user_data_types values (1, 'open'), (2, 'orig');

create index ix_users_wealth on users (wealth);
create index ix_users_name on users using hash (name);
create index ix_roles_val on roles using hash (val);
create index ix_arena_types_val on arena_types using hash (val);
create index ix_user_data_types_val on user_data_types using hash (val);
create index ix_arena_score on arena (arena_id, score desc, day desc, "rank");
create index ix_arena_user_id on arena using hash (user_id);
create index ix_bazaar_user_id on bazaar using hash (user_id);
create index ix_bazaar_code on bazaar using hash (code);
create index ix_stats_user_id on stats using hash (user_id);
create index ix_stats_when on stats ("when");
create index ix_original_import_name on original_import using hash (name);
