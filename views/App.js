module.exports = class App extends preact.Component {
	constructor(props) {
		super(props);
		this.state = { view: props.view, viewProps: Object.assign({}, props.viewProps, { doNav: this.doNav.bind(this) }) };
	}

	doNav(view, viewProps) {
		this.setState({ view: view, viewProps: Object.assign({}, viewProps, { doNav: this.doNav.bind(this) }) });
	}

	render() {
		return preact.h(this.state.view, this.state.viewProps);
	}
}