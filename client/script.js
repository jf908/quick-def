const serverUrl = 'http://localhost:5678';

function post(path, obj) {
    return fetch(serverUrl + path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(obj)
    }).then(res => res.json());
}

Vue.component('single-def', {
    props: ['def'],
    template: `
    <div class="def card">
        <div class="remove" @click="$emit('remove', def.id)">X</div>
        <div class="term">{{ def.term }} <span v-if="def.category !== ''" class="category">{{ def.category }}</span></div>
        <div class="definition">{{ def.definition }}</div>
    </div>
    `
});

Vue.component('category-input', {
  props: {
    options: Array,
    value: String,
    placeholder: String
  },
  data() {
    return {
      selected: -1,
      focused: false
    }
  },
  computed: {
    filteredOptions() {
      return this.options.filter(opt => opt.toLowerCase().startsWith(this.value.toLowerCase())).slice(0,5);
    }
  },
  watch: {
      value() {
        this.selected = -1;
      }
  },
  methods: {
    focus() {
      this.focused = true;
      this.selected = -1;
      this.$emit('input', '');
    },
    unfocus() {
      this.focused = false;
    },
    keypress(e) {
      switch(e.key) {
        case 'ArrowUp':
          if(this.selected > 0) this.selected--;
          break;
        case 'ArrowDown':
          if(this.selected < this.filteredOptions.length-1) this.selected++;
          break;
        case 'Enter':
        case 'Tab':
            if(this.filteredOptions.length > 0 && this.selected !== -1) {
                this.$emit('input', this.filteredOptions[this.selected]);
            }
        case 'Escape':
          this.$refs.input.blur();
      }
    },
  },
  template: `
    <div class="category-input" :class="{focused: focused}">
        <input class="select-input-search" 
            ref="input"
            type="text"
            :placeholder="placeholder"
            :value="value"
            @input="$emit('input', $event.target.value)"
            @focusin="focus"
            @focusout="unfocus"
            @keydown="keypress">
        <transition-group tag="div" name="option-list" class="options" :class="{open: focused}">
            <div class="option"
                v-for="(option,index) in filteredOptions"
                :key="option"
                :class="{selected: selected == index}"
                @mousedown="$emit('input', option)"
                @mousemove="selected = index">
                {{ option }}
            </div>
        </transition-group>
    </div>
    `
});



Vue.component('input-definition', {
    props: ['categories'],
    data() {
        return {
            term: '',
            definition: '',
            category: ''
        };
    },
    methods: {
        add() {
            if(this.term == '' || this.definition == '') return;

            post('/add', {
                term: this.term,
                definition: this.definition,
                category: this.category
            }).then(res => {
                this.$emit('add', res);
            });
            this.term = '';
            this.definition = '';
            this.category = '';
            this.$refs.term.focus();
        }
    },
    template: `
    <div class="input-definition card">
        <div class="input-top">
            <input ref="term" class="term" type="text" v-model="term" placeholder="Term">
            <category-input v-model="category" :options="categories" :placeholder="'Category'"></category-input>
        </div>
        <textarea rows="3" v-model="definition" placeholder="Definition" class="definition"></textarea>
        <button class="add" @click="add">Add</button>
    </div>
    `
});

new Vue({
    el: '#app',
    data: {
        defs: {},
        searchTerm: '',
        categoryFilter: ''
    },
    computed: {
        defList() {
            return Object.values(this.defs);
        },
        filteredDefList() {
            return this.defList.filter(s => 
                (this.categoryFilter == '' || s.category == this.categoryFilter)
                && (this.searchTerm == '' || s.term.toLowerCase().startsWith(this.searchTerm.toLowerCase()))
            );
        },
        categories() {
            const s = new Set(this.defList.map(d => d.category));
            s.delete('');
            return [...s].sort();
        }
    },
    methods: {
        add(def) {
            Vue.set(this.defs, def.id, def);
        },
        remove(id) {
            post('/delete', {
                id
            }).then(res => {
                Vue.delete(this.defs, res.id);
            });
        }
    },
    mounted() {
        fetch(serverUrl + '/all').then(res => res.json()).then(defs => {
            this.defs = defs;
        });
    }
});