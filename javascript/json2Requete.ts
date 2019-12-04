"use strict"

class json2Requete{

    /**
     * Receive json, generate adql
     * @param json :the json with constraints
     * @return : adql
     */
    static getAdql(json:dic){
        var jsonAll = json;
        var adql = "";
        var column=[];
        var constraint="";
        let schema:string="";
        for(var key in jsonAll)
        {
            if(jsonAll[key].schema=="public")//when schema_name = public, it needs to be double quoted.
            {
                schema="\"public\"";
            }
            else{
                schema = jsonAll[key].schema
            }
            if(jsonAll[key].columns!=[]){//root table's columns
                for(var columnkey in jsonAll[key].columns){
                    if( jsonAll[key].columns[columnkey].indexOf("*")!=-1){
                        column.push(jsonAll[key].columns[columnkey]);
                    }
                    else{
                        column.push(schema+"."+key+"."+jsonAll[key].columns[columnkey]);
                    }
                }
            }
            if(jsonAll[key].join_tables!=undefined){//root table's join tables
                var columnJoin =json2Requete.getColumn(jsonAll[key].join_tables,schema);
                column.push(...columnJoin);
                if(jsonAll[key].constraints!=undefined&&jsonAll[key].constraints.length!=0){//root table's constraints
                    constraint = jsonAll[key].constraints;

                    constraint += json2Requete.getConstraint(jsonAll[key].join_tables,1);
                }
                else{
                    constraint += json2Requete.getConstraint(jsonAll[key].join_tables,0);
                }
                
            }
            else{//root table hasn't join tables
                if(jsonAll[key].constraints!=""){
                    constraint = jsonAll[key].constraints;
                }
            }
        }
        adql +="SELECT "+"\n"+"TOP 100"+"\n";//+"\n"+"DISTINCT"
        for(var i = 0;i<column.length;i++){
        if(i==column.length-1){
            adql += column[i] +"\n";
        }
        else{
            adql += column[i] + ", "+"\n";
        }
        }
        adql += "FROM ";
        for(var key in jsonAll)
        {
        adql += schema+"."+key + " "+"\n";
        adql += json2Requete.getJoin(jsonAll[key].join_tables,key,schema);
        }
        if(constraint!=""){
        adql += "WHERE "+"\n" + constraint ;
        }
        for(var key in jsonAll)
        {
            for(var keyJoin in jsonAll[key].join_tables)
            {
                var id = jsonAll[key].join_tables[keyJoin].target;
            }
        }
        
        if(id!=undefined&& adql.indexOf("public")!=-1){//@TODO
            adql +="\n"
            adql +="ORDER BY " + id;
        }
        
        return adql;
    }

    static getColumn(json:dic,schema:string){
        let column:string[]=[];
        for(var key in json)
            {
            for(var columnkey in json[key].columns){
                
                if( json[key].columns[columnkey].indexOf("*")!=-1){
                    column.push(json[key].columns[columnkey]);
                }
                else{
                    if(json2Requete.isString(json[key].columns[columnkey]))
                    {
                        column.push(schema+"."+key+"."+json[key].columns[columnkey]);
                    }
                    else{//have more than two keys
                        column.push(schema+"."+key+"."+json[key].columns[columnkey][0])
                    }
                }
            }
            if(json[key].join_tables!=undefined){
                column.push(...json2Requete.getColumn(json[key].join_tables,schema));
            }
        }
        return column;
    }

    static getConstraint(json:dic,flag:number){
        var constraint="";
        for(var key in json)
        {
            if(json[key].constraints!=undefined && flag!=0&&json[key].constraints.length!=0){
                constraint += "\n"+"AND"+"\n";
                constraint += json[key].constraints;
                flag++;
            }
            else if(json[key].constraints!=undefined && flag == 0&&json[key].constraints.length!=0){
                constraint += json[key].constraints;
                flag++;
            }
            if(json[key].join_tables!=undefined){
                constraint += json2Requete.getConstraint(json[key].join_tables,flag);
            }
        }
        return constraint;
    }

    static isString(s:string){
        return typeof s === 'string';
    }


    static getJoin(json:dic,table:string,schema:string){
        var retour="";
        for(var key in json)
        {
            retour += "JOIN "+schema+"."+key+" "+"\n";
            if(json2Requete.isString(json[key].target) && json2Requete.isString(json[key].from)){
                retour += "ON " + schema+"."+table + "." + json[key].target + "=" + schema+"."+key + "." + json[key].from + " "+"\n";
                if(json2Requete.getJoin(json[key].join_tables,key,schema)!=""){
                    retour += json2Requete.getJoin(json[key].join_tables,key,schema);
                }
            }
            else{
                var n = json[key].target.length;
                retour += "ON " + schema+"."+table + "." + json[key].target[0] + "=" + schema+"."+key + "." + json[key].from[0] + " "+"\n";
                for(var i=1;i<n;i++){
                    retour += "AND ";
                    retour += schema+"."+table + "." + json[key].target[i] + "=" + schema+"."+key + "." + json[key].from[i] + " "+"\n";
                }
                if(json2Requete.getJoin(json[key].join_tables,key,schema)!=""){
                    retour += json2Requete.getJoin(json[key].join_tables,key,schema);
                }
            }
        }
        return retour;
    }
}

