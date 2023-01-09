function onlyUnique(arr) {
    var tmp = [];
    var val = '';
    for (var i = 0; i < arr.length; i++) {
        if(typeof arr[i] == 'string'){
            val = arr[i].trim();
            if(val.length == 0) continue;
        }else{
            val = arr[i];
        }
        if(!tmp.includes(val)){
            tmp.push(val);
        }
    }
    return tmp;
}

function properize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function deepCopy(obj){
  return JSON.parse(JSON.stringify(obj));
}

function translateRarity(rar){
  rar = rar.toLowerCase()
  if(rarities.includes(rar)){
    return rar;
  }
  return 'special';
}

const delay = ms => new Promise(res => setTimeout(res, ms));

function arrayMove(arr, oldIndex, newIndex) {
    arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0]);
};