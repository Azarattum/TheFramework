import "./example.scss";
import Template from "./example.pug";
import View from "../../../common/view.abstract";

/**
 * Example view
 */
export default class Example extends View {
	public constructor() {
		super(Example.name);
		this.template = Template;
	}
}
