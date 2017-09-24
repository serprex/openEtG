module.exports = class App extends preact.Component {
	constructor(props) {
		super(props);
		this.doNav = this.doNav.bind(this);
		require('../px').doNav = this.doNav; // TODO remove px.doNav
		this.state = { view: props.view, viewProps: Object.assign({}, props.viewProps, { doNav: this.doNav }) };
	}

	doNav(view, viewProps) {
		this.setState({ view: view, viewProps: Object.assign({}, viewProps, { doNav: this.doNav }) });
	}

	render() {
		return preact.h(this.state.view, this.state.viewProps);
	}
}