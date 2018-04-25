const store = require('../store');
module.exports = function(props){
	const {game} = props;
	return <>
		<div style={{
			position: 'absolute',
			left: '10px',
			top: '290px',
		}}>{game.ply} plies<br/>{(game.time/1000).toFixed(1)} seconds</div>
		<input type='button'
			value='Exit'
			style={{
				position: 'absolute',
				left: '412px',
				top: '440px',
			}}
			onClick={() => store.store.dispatch(store.doNav(require("./Editor")))}
		/>
		{game.winner == game.player1 &&
			<div style={{
				position: 'absolute',
				left: '0px',
				top: '250px',
				textAlign: 'center',
				width: '900px',
			}}>You won!</div>
		}
	</>;
}