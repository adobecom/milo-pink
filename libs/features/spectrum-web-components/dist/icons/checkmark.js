/* eslint-disable */
/* Generated by Milo */

var k=Object.defineProperty;var v=Object.getOwnPropertyDescriptor;var g=Object.getOwnPropertyNames;var b=Object.prototype.hasOwnProperty;var I=(i,t)=>{for(var c in t)k(i,c,{get:t[c],enumerable:!0})},p=(i,t,c,e)=>{if(t&&typeof t=="object"||typeof t=="function")for(let s of g(t))!b.call(i,s)&&s!==c&&k(i,s,{get:()=>t[s],enumerable:!(e=v(t,s))||e.enumerable});return i},d=(i,t,c)=>(p(i,t,"default"),c&&p(c,t,"default"));var n={};I(n,{ElementSizes:()=>D,SizedMixin:()=>N,SpectrumElement:()=>l,SpectrumMixin:()=>f});import{LitElement as C}from"/libs/deps/lit-all.min.js";var z="0.42.5";var h=new Set,E=()=>{let i=document.documentElement.dir==="rtl"?document.documentElement.dir:"ltr";h.forEach(t=>{t.setAttribute("dir",i)})},S=new MutationObserver(E);S.observe(document.documentElement,{attributes:!0,attributeFilter:["dir"]});var w=i=>typeof i.startManagingContentDirection<"u"||i.tagName==="SP-THEME";function f(i){class t extends i{get isLTR(){return this.dir==="ltr"}hasVisibleFocusInTree(){let e=((s=document)=>{var o;let r=s.activeElement;for(;r!=null&&r.shadowRoot&&r.shadowRoot.activeElement;)r=r.shadowRoot.activeElement;let m=r?[r]:[];for(;r;){let a=r.assignedSlot||r.parentElement||((o=r.getRootNode())==null?void 0:o.host);a&&m.push(a),r=a}return m})(this.getRootNode())[0];if(!e)return!1;try{return e.matches(":focus-visible")||e.matches(".focus-visible")}catch{return e.matches(".focus-visible")}}connectedCallback(){if(!this.hasAttribute("dir")){let e=this.assignedSlot||this.parentNode;for(;e!==document.documentElement&&!w(e);)e=e.assignedSlot||e.parentNode||e.host;if(this.dir=e.dir==="rtl"?e.dir:this.dir||"ltr",e===document.documentElement)h.add(this);else{let{localName:s}=e;s.search("-")>-1&&!customElements.get(s)?customElements.whenDefined(s).then(()=>{e.startManagingContentDirection(this)}):e.startManagingContentDirection(this)}this._dirParent=e}super.connectedCallback()}disconnectedCallback(){super.disconnectedCallback(),this._dirParent&&(this._dirParent===document.documentElement?h.delete(this):this._dirParent.stopManagingContentDirection(this),this.removeAttribute("dir"))}}return t}var l=class extends f(C){};l.VERSION=z;import{property as y}from"/libs/deps/lit-all.min.js";var U=Object.defineProperty,_=Object.getOwnPropertyDescriptor,M=(i,t,c,e)=>{for(var s=e>1?void 0:e?_(t,c):t,o=i.length-1,r;o>=0;o--)(r=i[o])&&(s=(e?r(t,c,s):r(s))||s);return e&&s&&U(t,c,s),s},D={xxs:"xxs",xs:"xs",s:"s",m:"m",l:"l",xl:"xl",xxl:"xxl"};function N(i,{validSizes:t=["s","m","l","xl"],noDefaultSize:c,defaultSize:e="m"}={}){class s extends i{constructor(){super(...arguments),this._size=e}get size(){return this._size||e}set size(r){let m=c?null:e,a=r&&r.toLocaleLowerCase(),u=t.includes(a)?a:m;if(u&&this.setAttribute("size",u),this._size===u)return;let x=this._size;this._size=u,this.requestUpdate("size",x)}update(r){!this.hasAttribute("size")&&!c&&this.setAttribute("size",this.size),super.update(r)}}return M([y({type:String})],s.prototype,"size",1),s}d(n,H);import*as H from"/libs/deps/lit-all.min.js";var P=n.css`
    .spectrum-UIIcon-Checkmark50{--spectrum-icon-size:var(--spectrum-checkmark-icon-size-50)}.spectrum-UIIcon-Checkmark75{--spectrum-icon-size:var(--spectrum-checkmark-icon-size-75)}.spectrum-UIIcon-Checkmark100{--spectrum-icon-size:var(--spectrum-checkmark-icon-size-100)}.spectrum-UIIcon-Checkmark200{--spectrum-icon-size:var(--spectrum-checkmark-icon-size-200)}.spectrum-UIIcon-Checkmark300{--spectrum-icon-size:var(--spectrum-checkmark-icon-size-300)}.spectrum-UIIcon-Checkmark400{--spectrum-icon-size:var(--spectrum-checkmark-icon-size-400)}.spectrum-UIIcon-Checkmark500{--spectrum-icon-size:var(--spectrum-checkmark-icon-size-500)}.spectrum-UIIcon-Checkmark600{--spectrum-icon-size:var(--spectrum-checkmark-icon-size-600)}
`,G=P;export{G as default};