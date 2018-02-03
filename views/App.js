const React = require('react'),
	{ connect } = require('react-redux');

module.exports = connect(state => ({ view: state.nav, viewProps: state.navprops }))(class App extends React.Component {
	constructor(props) {
		super(props);
		this.doNav = this.doNav.bind(this);
		require('../px').doNav = this.doNav; // TODO remove px.doNav
	}

	doNav(view, viewProps) {
		this.props.dispatch({
			type: 'NAV',
			nav: view,
			props: viewProps,
		});
	}

	render() {
		return React.createElement(this.props.view, Object.assign({ doNav: this.doNav }, this.props.viewProps));
	}
});
