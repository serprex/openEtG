create type pbkdf2algo as enum('SHA1', 'SHA512');
create type userrole as enum('Codesmith', 'Mod');
create type leaderboard_category as enum('Wealth', 'Streak0', 'Streak1', 'Streak2', 'Streak3', 'Streak4', 'Streak5', 'Colosseum');
create table users (
	id bigserial not null primary key,
	name text not null unique,
	auth text not null,
	salt bytea not null,
	iter int not null,
	algo pbkdf2algo not null
);
create table user_data (
	id bigserial not null primary key,
	user_id bigint not null references users(id),
	type_id int not null,
	name text not null,
	data json not null,
	unique (user_id, type_id, name)
);
create table user_role (
	user_id bigint not null references users(id),
	role_id userrole not null,
	unique (user_id, role_id)
);
create table leaderboard (
	data_id bigint not null references user_data(id),
	league_id bigint not null,
	category leaderboard_category not null,
	val int not null,
	unique(data_id, league_id, category)
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
create table arena (
	user_id bigint not null references users(id),
	arena_id int not null,
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
create unlogged table stats (
	id bigserial not null primary key,
	user_id bigint not null references users(id),
	stats json not null,
	"set" text not null,
	players json[] not null,
	"when" timestamp not null default now()
);
create unlogged table games (
	id bigserial not null primary key,
	data json not null,
	moves json[] not null,
	expire_at timestamp not null
);
create unlogged table trade_request (
	user_id bigint not null references users(id),
	for_user_id bigint not null references users(id),
	cards text not null,
	g int not null,
	forcards text,
	forg int,
	expire_at timestamp not null,
	alt text not null,
	foralt text,
	unique (user_id, for_user_id)
);
create unlogged table match_request (
	game_id bigint not null references games(id),
	user_id bigint not null references users(id),
	accepted boolean not null,
	unique (game_id, user_id)
);

create index ix_users_name on users using hash (name);
create index ix_user_data_user_id on user_data using hash (user_id);
create index ix_arena_score on arena (arena_id, score desc, day desc, "rank");
create index ix_arena_user_id on arena using hash (user_id);
create index ix_bazaar_user_id on bazaar using hash (user_id);
create index ix_bazaar_code on bazaar using hash (code);
create index ix_stats_user_id on stats using hash (user_id);
create index ix_stats_when on stats ("when");
create index ix_leaderboard_val on leaderboard (league_id, category, val desc);
